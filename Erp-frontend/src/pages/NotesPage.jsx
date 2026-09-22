import { useEffect, useState } from 'react';
import {
  getAllClasses,
  getMesClasses,
  getMesEtudiants,
  getMesNotes,
} from '../api/erpApi';
import DataTable from '../components/DataTable';
import { useAuth } from '../context/AuthContext';
import { useGlobalMessage } from '../utils/notifications';

const getClassId = (student) => student?.classeId ?? student?.classe?.id ?? student?.classe;
const getName = (student) => [student?.nom, student?.prenom].filter(Boolean).join(' ') || '—';
const normalizeText = (value) => String(value || '').trim().toLowerCase();
const getStudentEmail = (student) => student?.email || student?.username || '';
const getNoteStudent = (note) => note?.etudiant || note?.student || note?.eleve || {};
const normalizeClasses = (items) => items.map((item) => item.classe || item.class || item).filter((item) => item?.id != null);
const getClassLevel = (classItem) => classItem?.niveau || classItem?.level || classItem?.niveauEtude || '';
const toArray = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  for (const key of keys) {
    if (value[key] !== undefined) {
      const nested = toArray(value[key], keys);
      if (nested.length) return nested;
    }
  }

  return [value];
};

const NotesPage = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useGlobalMessage('error');

  const loadNotesPage = async () => {
    try {
      const [studentsResult, assignedClassesResult, classesResult, notesResult] = await Promise.allSettled([
        getMesEtudiants(),
        getMesClasses(),
        getAllClasses(),
        getMesNotes(),
      ]);
      setStudents(studentsResult.status === 'fulfilled' ? toArray(studentsResult.value.data, ['data', 'content', 'students', 'items']) : []);
      const assignedClasses = assignedClassesResult.status === 'fulfilled'
        ? normalizeClasses(toArray(assignedClassesResult.value.data, ['data', 'content', 'classes', 'items']))
        : [];
      const allClasses = classesResult.status === 'fulfilled'
        ? toArray(classesResult.value.data, ['data', 'content', 'classes', 'items'])
        : [];
      const classesMap = new Map([...allClasses, ...assignedClasses].map((item) => [String(item.id), item]));
      setClasses([...classesMap.values()]);
      const loadedNotes = notesResult.status === 'fulfilled' ? toArray(notesResult.value.data, ['data', 'content', 'notes', 'items']) : [];
      setNotes(loadedNotes);
    } catch (error) {
      console.error('Failed to load professor notes:', error);
      setErrorMessage('Impossible de charger les étudiants et les notes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(loadNotesPage, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStudentClass = (student) => classes.find((item) => String(item.id) === String(getClassId(student)));

  const availableLevels = [...new Set(classes.map(getClassLevel).filter(Boolean))];
  const availableClasses = classes.filter((classItem) => !selectedLevel || String(getClassLevel(classItem)) === String(selectedLevel));
  const filteredStudents = students.filter((student) => {
    if (!selectedLevel && !selectedClassId) return false;

    const studentClassId = getClassId(student);
    const studentClass = classes.find((classItem) => String(classItem.id) === String(studentClassId));
    if (selectedLevel && (!studentClass || String(getClassLevel(studentClass)) !== String(selectedLevel))) return false;
    if (selectedClassId && String(studentClassId) !== String(selectedClassId)) return false;
    return true;
  });

  const getStudentNotes = (student) => notes.filter((note) => {
    const noteStudent = getNoteStudent(note);
    const noteStudentId = note.etudiantId ?? note.studentId ?? note.eleveId ?? noteStudent.id;
    const noteEmail = note.etudiantEmail || note.studentEmail || noteStudent.email || noteStudent.username;
    const noteCne = note.etudiantCne || note.studentCne || noteStudent.cne;
    const noteName = note.etudiantNom || note.studentName || noteStudent.nom || noteStudent.name;
    const studentName = getName(student);

    return (noteStudentId != null && String(noteStudentId) === String(student.id))
      || (noteEmail && normalizeText(noteEmail) === normalizeText(getStudentEmail(student)))
      || (noteCne && normalizeText(noteCne) === normalizeText(student.cne))
      || (noteName && normalizeText(noteName) === normalizeText(studentName));
  });

  const columns = [
    { key: 'nom', label: 'Étudiant', render: (row) => getName(row) },
    { key: 'email', label: 'Email' },
    { key: 'cne', label: 'CNE' },
    { key: 'classe', label: 'Classe', render: (row) => getStudentClass(row)?.nom || '—' },
    {
      key: 'notes',
      label: 'Note',
      render: (row) => {
        const studentNotes = getStudentNotes(row);

        if (!studentNotes.length) {
          return <span className="text-muted">Aucune note</span>;
        }

        return (
          <div className="student-notes-list">
            {studentNotes.map((note) => (
              <div className="student-note-chip" key={note.id || `${note.evaluationId}-${note.dateSaisie}`}>
                <strong>{note.valeur}/20</strong>
                <small>{note.evaluationTitre || note.evaluation?.titre || 'Évaluation'}</small>
              </div>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <header className="page-header">
        <div className="page-title-row"><h1>Saisie des Notes</h1></div>
        <p className="page-subtitle">Consultez et saisissez les notes de vos étudiants.</p>
      </header>

      <div className="app-card rounded-card p-4 mb-4">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Niveau</label>
            <select className="form-select" value={selectedLevel} onChange={(event) => { setSelectedLevel(event.target.value); setSelectedClassId(''); }}>
              <option value="">Choisir un niveau</option>
              {availableLevels.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Classe</label>
            <select className="form-select" value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)} disabled={!selectedLevel}>
              <option value="">{selectedLevel ? 'Choisir une classe' : 'Choisir un niveau d’abord'}</option>
              {availableClasses.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.nom || `Classe ${classItem.id}`}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? <div className="app-card rounded-card p-4 text-center">Chargement des étudiants...</div> : <DataTable columns={columns} rows={filteredStudents} emptyMessage="Choisissez un niveau ou une classe pour afficher les étudiants." />}
      {errorMessage && <div className="alert alert-danger mt-3" role="alert">{errorMessage}</div>}
    </>
  );
};

export default NotesPage;
