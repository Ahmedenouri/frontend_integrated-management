import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  addBulletin,
  downloadBulletinPdf,
  getAllBulletins,
  getAllClasses,
  getAllEvaluations,
  getAllMatieres,
  getAllNotes,
  getAllStudents,
  getAllTeachers,
  getMesNotes,
} from '../api/erpApi';
import DataTable from '../components/DataTable';
import { useAuth } from '../context/AuthContext';

const toArray = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  for (const key of keys) {
    if (value[key] !== undefined) return toArray(value[key], keys);
  }

  return [value];
};

const getStudentId = (student) => student?.id ?? student?.etudiantId ?? student?.studentId;
const getClassName = (classItem) => classItem?.nom || classItem?.name || classItem?.libelle || `Class ${classItem?.id}`;
const getStudentName = (student) => [student?.prenom, student?.nom].filter(Boolean).join(' ');
const getNoteValue = (note) => note?.valeur ?? note?.value ?? note?.note ?? note?.noteValue;
const getTeacherName = (teacher) => [teacher?.prenom, teacher?.nom].filter(Boolean).join(' ') || teacher?.name || teacher?.email || 'Professor';
const getSubjectName = (subject) => {
  if (typeof subject === 'string') return subject;
  return subject?.intitule || subject?.nom || subject?.name || subject?.libelle || subject?.designation
    || subject?.matiereNom || subject?.subjectName || (subject?.id ? `Matière ${subject.id}` : 'Matière non renseignée');
};
const getCurrentAcademicYear = () => {
  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
};
const getDirectorId = (profile) => profile?.directeurId ?? profile?.id ?? profile?.user?.id;

const BulletinsPage = () => {
  const [bulletins, setBulletins] = useState([]);
  const [classes, setClasses] = useState([]);
  const [notes, setNotes] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [generatingId, setGeneratingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const { userRole, userProfile } = useAuth();
  const isDirector = userRole === 'ROLE_DIRECTEUR';
  const isStudent = userRole === 'ROLE_ETUDIANT';
  const currentStudentId = userProfile?.etudiantId ?? userProfile?.studentId ?? userProfile?.id;
  const currentStudentName = [userProfile?.prenom, userProfile?.nom].filter(Boolean).join(' ') || userProfile?.name || 'Etudiant';

  useEffect(() => {
    const loadBulletins = async () => {
      try {
        if (isStudent) {
          const [notesResult, subjectsResult, evaluationsResult] = await Promise.all([
            getMesNotes(),
            getAllMatieres(),
            getAllEvaluations(),
          ]);
          setNotes(toArray(notesResult.data, ['data', 'content', 'notes', 'items']));
          setSubjects(toArray(subjectsResult.data, ['data', 'content', 'matieres', 'subjects', 'items']));
          setEvaluations(toArray(evaluationsResult.data, ['data', 'content', 'evaluations', 'items']));
          return;
        }

        const [bulletinsResult, studentsResult, classesResult, notesResult, evaluationsResult, subjectsResult, teachersResult] = await Promise.all([
          getAllBulletins(),
          getAllStudents(),
          getAllClasses(),
          getAllNotes(),
          getAllEvaluations(),
          getAllMatieres(),
          getAllTeachers(),
        ]);

        const students = toArray(studentsResult.data, ['data', 'content', 'students', 'items']);
        const classItems = toArray(classesResult.data, ['data', 'content', 'classes', 'items']);
        const studentsById = new Map(students.map((student) => [String(getStudentId(student)), student]));
        const classesById = new Map(classItems.map((classItem) => [String(classItem.id), classItem]));

        const enrichedBulletins = toArray(bulletinsResult.data, ['data', 'content', 'bulletins', 'items']).map((bulletin) => {
          const student = bulletin.etudiant || bulletin.student || studentsById.get(String(bulletin.etudiantId ?? bulletin.studentId));
          const classId = bulletin.classeId ?? student?.classeId ?? student?.classe?.id ?? student?.classId ?? student?.class?.id;
          const classItem = bulletin.classe || bulletin.class || classesById.get(String(classId));

          return {
            ...bulletin,
            studentId: bulletin.etudiantId ?? bulletin.studentId ?? getStudentId(student),
            studentName: bulletin.studentName || getStudentName(student) || 'N/A',
            className: bulletin.className || classItem?.nom || classItem?.name || classItem?.libelle || 'N/A',
            classId,
          };
        });

        const bulletinByStudentId = new Map(enrichedBulletins.map((bulletin) => [String(bulletin.studentId), bulletin]));
        const studentBulletins = students.map((student) => {
          const studentId = getStudentId(student);
          const existingBulletin = bulletinByStudentId.get(String(studentId));
          const classId = student.classeId ?? student.classe?.id ?? student.classId ?? student.class?.id;
          const classItem = classesById.get(String(classId));

          return existingBulletin || {
            id: `student-${studentId}`,
            studentId,
            studentName: getStudentName(student) || 'N/A',
            className: classItem ? getClassName(classItem) : 'N/A',
            classId,
            anneeScolaire: '—',
            semestre: '—',
            moyenneGenerale: '—',
            appreciationGenerale: '—',
            isGenerated: false,
          };
        });

        setBulletins(studentBulletins);
        setNotes(toArray(notesResult.data, ['data', 'content', 'notes', 'items']));
        setEvaluations(toArray(evaluationsResult.data, ['data', 'content', 'evaluations', 'items']));
        setSubjects(toArray(subjectsResult.data, ['data', 'content', 'matieres', 'subjects', 'items']));
        setTeachers(toArray(teachersResult.data, ['data', 'content', 'professeurs', 'teachers', 'items']));
        setClasses(classItems.filter((classItem) => classItem?.id != null));
      } catch (error) {
        console.error('Failed to load bulletins:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBulletins();
  }, [isStudent]);

  const filteredBulletins = bulletins.filter((bulletin) => (
    !selectedClassId || String(bulletin.classId) === String(selectedClassId)
  ));

  const getBulletinNotes = (bulletin) => notes.filter((note) => {
    const noteStudent = note.etudiant || note.student || note.eleve || {};
    const noteStudentId = note.etudiantId ?? note.studentId ?? note.eleveId ?? noteStudent.id;
    return String(noteStudentId) === String(bulletin.studentId);
  });

  const getNoteEvaluation = (note) => note.evaluation || evaluations.find((evaluation) => String(evaluation.id) === String(note.evaluationId)) || {};
  const getNoteSubject = (note) => {
    const evaluation = getNoteEvaluation(note);
    const rawSubject = note.matiere || note.subject || evaluation.matiere || evaluation.subject;
    const subjectId = note.matiereId ?? note.subjectId ?? evaluation.matiereId ?? evaluation.subjectId
      ?? rawSubject?.id;
    const subjectName = note.matiereNom || note.matiereName || note.subjectName || note.subjectNom
      || evaluation.matiereNom || evaluation.matiereName || evaluation.subjectName;

    if (typeof rawSubject === 'string') return { intitule: rawSubject, id: subjectId };
    if (rawSubject) return rawSubject;
    if (subjectName) return { intitule: subjectName, id: subjectId };
    return subjects.find((subject) => String(subject.id) === String(subjectId));
  };
  const getNoteTeacher = (note) => {
    const teacherId = note.professeurId ?? note.teacherId ?? note.professeur?.id ?? note.teacher?.id;
    return note.professeur || note.teacher || teachers.find((teacher) => String(teacher.id) === String(teacherId));
  };

  const getStudentAverage = (studentId) => {
    const studentNotes = notes.filter((note) => {
      const noteStudent = note.etudiant || note.student || note.eleve || {};
      return String(note.etudiantId ?? note.studentId ?? note.eleveId ?? noteStudent.id) === String(studentId);
    });
    if (!studentNotes.length) return 0;

    let weightedTotal = 0;
    let totalCoefficient = 0;
    studentNotes.forEach((note) => {
      const evaluation = getNoteEvaluation(note);
      const subject = getNoteSubject(note);
      const coefficient = Number(subject?.coefficient ?? evaluation.coefficient ?? 1);
      const value = Number(getNoteValue(note));
      if (!Number.isNaN(value)) {
        weightedTotal += value * (Number.isNaN(coefficient) ? 1 : coefficient);
        totalCoefficient += Number.isNaN(coefficient) ? 1 : coefficient;
      }
    });

    return totalCoefficient ? Number((weightedTotal / totalCoefficient).toFixed(2)) : 0;
  };

  const getNotesAverage = (studentNotes) => {
    if (!studentNotes.length) return null;

    let weightedTotal = 0;
    let totalCoefficient = 0;
    getGroupedSubjectNotes(studentNotes).forEach((group) => {
      const subjectCoefficient = Number(group.subject?.coefficient ?? 1);
      const coefficient = Number.isNaN(subjectCoefficient) ? 1 : subjectCoefficient;
      const average = getSubjectAverage(group.notes);

      if (average !== null) {
        weightedTotal += average * coefficient;
        totalCoefficient += coefficient;
      }
    });

    return totalCoefficient ? Number((weightedTotal / totalCoefficient).toFixed(2)) : null;
  };

  const getSubjectAverage = (subjectNotes) => {
    const values = subjectNotes
      .map((note) => Number(getNoteValue(note)))
      .filter((value) => !Number.isNaN(value));

    if (!values.length) return null;
    return Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(2));
  };

  const getAppreciation = (average) => {
    if (average >= 16) return 'Très bien';
    if (average >= 14) return 'Bien';
    if (average >= 10) return 'Assez bien';
    return 'Insuffisant';
  };

  const getGroupedSubjectNotes = (studentNotes) => {
    const groups = new Map();

    studentNotes.forEach((note) => {
      const subject = getNoteSubject(note) || {};
      const subjectName = getSubjectName(subject);
      const subjectKey = String(subject.id ?? note.matiereId ?? note.subjectId ?? subjectName).toLowerCase();
      const currentGroup = groups.get(subjectKey) || { subject, subjectName, notes: [] };
      currentGroup.notes.push(note);
      if (!currentGroup.subject?.id && subject.id) currentGroup.subject = subject;
      groups.set(subjectKey, currentGroup);
    });

    return [...groups.values()];
  };

  const handleGenerateBulletin = async (bulletin) => {
    if (!isDirector || !bulletin.studentId || generatingId === bulletin.studentId) return;

    const directorId = getDirectorId(userProfile);
    if (!directorId) return;

    setGeneratingId(bulletin.studentId);
    try {
      const average = getStudentAverage(bulletin.studentId);
      const { data: createdBulletin } = await addBulletin({
        anneeScolaire: getCurrentAcademicYear(),
        semestre: 1,
        moyenneGenerale: average,
        dateGeneration: new Date().toISOString().slice(0, 10),
        appreciationGenerale: average >= 16 ? 'Très bien' : average >= 14 ? 'Bien' : average >= 10 ? 'Passable' : 'Insuffisant',
        etudiantId: Number(bulletin.studentId),
        directeurId: Number(directorId),
      });
      setBulletins((current) => current.map((item) => (
        String(item.studentId) === String(bulletin.studentId) ? { ...item, ...createdBulletin, studentId: bulletin.studentId, isGenerated: true } : item
      )));
    } catch (error) {
      console.error('Failed to generate bulletin:', error);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleDownload = async (bulletin) => {
    if (!bulletin.studentId || downloadingId === bulletin.id) return;

    setDownloadingId(bulletin.id);
    try {
      if (isStudent) {
        const document = new jsPDF();
        const groupedSubjects = getGroupedSubjectNotes(notes);
        const safeName = currentStudentName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'etudiant';
        const pageWidth = document.internal.pageSize.getWidth();
        const tableX = 12;
        const tableWidth = pageWidth - (tableX * 2);
        const columnWidths = [72, 25, 25, tableWidth - 122];
        const studentClass = userProfile?.classe?.nom || userProfile?.classeNom || userProfile?.classeName || '—';
        const today = new Date().toLocaleDateString('fr-FR');
        let y = 18;

        document.setTextColor(0, 0, 255);
        document.setFontSize(16);
        document.setFont(undefined, 'bold');
        document.text('ÉTABLISSEMENT SCOLAIRE - ERP', pageWidth / 2, y, { align: 'center' });
        document.setTextColor(0, 0, 0);
        document.setFontSize(12);
        document.text('BULLETIN DE NOTES OFFICIEL', pageWidth / 2, y + 7, { align: 'center' });

        document.setFontSize(9);
        document.text(`Nom & Prénom: ${currentStudentName}`, 14, y + 21);
        document.text(`Date d'édition: ${today}`, 148, y + 21);
        document.text(`Classe: ${studentClass}`, 14, y + 29);
        document.text(`ID Étudiant: ${currentStudentId || '—'}`, 148, y + 29);

        y += 38;
        const headerHeight = 8;
        const rowHeight = 8;
        const headers = ['Matière', 'Note / 20', 'Coeff.', 'Appréciation'];
        document.setFillColor(190, 190, 190);
        document.rect(tableX, y, tableWidth, headerHeight, 'FD');
        document.setTextColor(0, 0, 0);
        document.setFontSize(8);
        document.setFont(undefined, 'bold');
        let columnX = tableX;
        headers.forEach((header, index) => {
          document.text(header, columnX + (columnWidths[index] / 2), y + 5.5, { align: 'center' });
          columnX += columnWidths[index];
        });
        y += headerHeight;
        document.setFont(undefined, 'normal');

        groupedSubjects.forEach((group) => {
          if (y + rowHeight > 275) {
            document.addPage();
            y = 20;
          }

          const average = getSubjectAverage(group.notes);
          const coefficient = group.subject?.coefficient ?? '—';
          const values = [getSubjectName(group.subject), average === null ? '—' : average.toFixed(2), String(coefficient), average === null ? '—' : getAppreciation(average)];
          columnX = tableX;
          document.rect(tableX, y, tableWidth, rowHeight);
          values.forEach((value, index) => {
            document.rect(columnX, y, columnWidths[index], rowHeight);
            document.text(String(value), columnX + (index === 0 ? 2 : columnWidths[index] / 2), y + 5.5, { align: index === 0 ? 'left' : 'center' });
            columnX += columnWidths[index];
          });
          y += rowHeight;
        });

        const generalAverage = getNotesAverage(notes);
        y += 14;
        document.setTextColor(255, 0, 0);
        document.setFontSize(12);
        document.setFont(undefined, 'bold');
        document.text(`MOYENNE GÉNÉRALE : ${generalAverage ?? '—'} / 20`, pageWidth - 14, y, { align: 'right' });
        document.setTextColor(0, 0, 0);
        document.setFontSize(9);
        document.text('Cachet et Signature du Directeur :', pageWidth - 14, y + 17, { align: 'right' });
        document.save(`bulletin-${safeName}.pdf`);
        return;
      }

      const response = await downloadBulletinPdf(bulletin.studentId);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      const safeName = bulletin.studentName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || `student-${bulletin.studentId}`;
      link.href = url;
      link.download = `bulletin-${safeName}-${bulletin.anneeScolaire || 'school-year'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download bulletin PDF:', error);
    } finally {
      setDownloadingId(null);
    }
  };

  const columns = [
    { key: 'studentName', label: 'Student' },
    { key: 'className', label: 'Class' },
    { key: 'anneeScolaire', label: 'Academic year' },
    { key: 'semestre', label: 'Semester' },
    { key: 'moyenneGenerale', label: 'Average' },
    { key: 'appreciationGenerale', label: 'General appreciation' },
    {
      key: 'detailedNotes',
      label: 'Notes by subject',
      render: (bulletin) => {
        const studentNotes = getBulletinNotes(bulletin);

        if (!studentNotes.length) return <span className="text-muted">No notes</span>;

        return (
          <div className="bulletin-notes-list">
            {studentNotes.map((note) => {
              const evaluation = getNoteEvaluation(note);
              const subject = getNoteSubject(note);
              const teacher = getNoteTeacher(note);
              return (
                <div className="bulletin-note-item" key={note.id || `${bulletin.studentId}-${note.evaluationId}-${note.dateSaisie}`}>
                  <strong>{getSubjectName(subject)}</strong>
                  <span className="bulletin-note-score">{getNoteValue(note) ?? '—'}/20</span>
                  <small>{evaluation.titre || 'Evaluation'} · coefficient {subject?.coefficient ?? evaluation.coefficient ?? '—'}</small>
                  <small>Professor: {getTeacherName(teacher)}</small>
                  <small>{note.dateSaisie || note.date || 'Date not provided'}{note.appreciation ? ` · ${note.appreciation}` : ''}</small>
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'PDF',
      render: (bulletin) => (
        <div className="d-flex gap-2">
          {isDirector && bulletin.isGenerated === false && (
            <button className="btn btn-sm btn-outline-success" type="button" onClick={() => handleGenerateBulletin(bulletin)} disabled={generatingId === bulletin.studentId} title="Generate bulletin">
              <i className="bi bi-plus-circle" />
              <span className="ms-1">{generatingId === bulletin.studentId ? 'Saving...' : 'Generate'}</span>
            </button>
          )}
          <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => handleDownload(bulletin)} disabled={!bulletin.studentId || downloadingId === bulletin.id} title="Download bulletin PDF">
            <i className={`bi ${downloadingId === bulletin.id ? 'bi-hourglass-split' : 'bi-file-earmark-pdf'}`} />
            <span className="ms-1">{downloadingId === bulletin.id ? 'Loading...' : 'PDF'}</span>
          </button>
        </div>
      ),
    },
  ];

  const studentNoteColumns = [
    {
      key: 'subject',
      label: 'Matière',
      render: (group) => getSubjectName(group.subject),
    },
    {
      key: 'evaluations',
      label: 'Notes',
      render: (group) => (
        <div className="bulletin-notes-list">
          {group.notes.map((note) => {
            const evaluation = getNoteEvaluation(note);
            return (
              <div className="bulletin-note-item" key={note.id || `${group.subjectName}-${note.evaluationId}-${note.dateSaisie}`}>
                <strong>{evaluation.titre || evaluation.type || 'Évaluation'}</strong>
                <span className="bulletin-note-score">{getNoteValue(note) ?? '—'}/20</span>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      key: 'average',
      label: 'Moyenne',
      render: (group) => `${getSubjectAverage(group.notes) ?? '—'}/20`,
    },
  ];

  return (
    <>
      <header className="page-header">
        <div className="page-title-row">
          <h1>{isStudent ? 'Mes notes' : 'Bulletins'}</h1>
        </div>
        <p className="page-subtitle">
          {isStudent ? 'Consultez uniquement vos notes.' : 'Official report cards available in the ERP.'}
        </p>
      </header>

      {!isStudent && (
        <div className="app-card rounded-card p-3 mb-4">
          <label className="form-label" htmlFor="bulletin-class-filter">Filter by class</label>
          <select
            id="bulletin-class-filter"
            className="form-select"
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
          >
            <option value="">All classes</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>{getClassName(classItem)}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="app-card rounded-card p-4 text-center">Loading bulletins...</div>
      ) : isStudent ? (
        <>
          <DataTable columns={studentNoteColumns} rows={getGroupedSubjectNotes(notes)} emptyMessage="Aucune note disponible." />
          <div className="app-card rounded-card p-4 mt-4 d-flex justify-content-between align-items-center gap-3">
            <div>
              <strong>Moyenne générale : </strong>
              <span>{getNotesAverage(notes) ?? '—'}{getNotesAverage(notes) !== null ? '/20' : ''}</span>
            </div>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => handleDownload({
                id: currentStudentId,
                studentId: currentStudentId,
                studentName: currentStudentName,
                anneeScolaire: getCurrentAcademicYear(),
              })}
              disabled={!currentStudentId || downloadingId === currentStudentId}
            >
              <i className={`bi ${downloadingId === currentStudentId ? 'bi-hourglass-split' : 'bi-file-earmark-pdf'}`} />
              <span className="ms-2">{downloadingId === currentStudentId ? 'Téléchargement...' : 'Télécharger le bulletin complet'}</span>
            </button>
          </div>
        </>
      ) : (
        <DataTable columns={columns} rows={filteredBulletins} emptyMessage="No bulletins found for this class." />
      )}
    </>
  );
};

export default BulletinsPage;
