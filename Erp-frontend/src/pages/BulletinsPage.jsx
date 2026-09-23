import { useEffect, useState } from 'react';
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
const getSubjectName = (subject) => subject?.intitule || subject?.nom || subject?.name || `Subject ${subject?.id}`;
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

  useEffect(() => {
    const loadBulletins = async () => {
      try {
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
  }, []);

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
    const subjectId = note.matiereId ?? note.subjectId ?? evaluation.matiereId ?? evaluation.matiere?.id;
    return note.matiere || note.subject || evaluation.matiere || subjects.find((subject) => String(subject.id) === String(subjectId));
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

  return (
    <>
      <header className="page-header">
        <div className="page-title-row">
          <h1>Bulletins</h1>
        </div>
        <p className="page-subtitle">Official report cards available in the ERP.</p>
      </header>

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

      {loading ? (
        <div className="app-card rounded-card p-4 text-center">Loading bulletins...</div>
      ) : (
        <DataTable columns={columns} rows={filteredBulletins} emptyMessage="No bulletins found for this class." />
      )}
    </>
  );
};

export default BulletinsPage;
