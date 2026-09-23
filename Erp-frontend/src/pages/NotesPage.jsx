import { useEffect, useState } from 'react';
import {
  addNote,
  getAllClasses,
  getAllEvaluations,
  getAllNotes,
  getAllStudents,
  getAllMatieres,
  getAllTeachers,
  getMesClasses,
  getMesEtudiants,
  getMesSeances,
  deleteNote,
  updateNote,
} from '../api/erpApi';
import DataTable from '../components/DataTable';
import { useAuth } from '../context/AuthContext';
import { useGlobalMessage } from '../utils/notifications';

const getClassId = (student) => student?.classeId ?? student?.classe?.id ?? student?.classe;
const getName = (student) => [student?.nom, student?.prenom].filter(Boolean).join(' ') || '—';
const getStudentEmail = (student) => student?.email || student?.username || '';
const getNoteStudent = (note) => note?.etudiant || note?.student || note?.eleve || {};
const normalizeClasses = (items) => items.map((item) => item.classe || item.class || item).filter((item) => item?.id != null);
const getClassLevel = (classItem) => classItem?.niveau || classItem?.level || classItem?.niveauEtude || '';
const getStudentId = (student) => student?.id ?? student?.etudiantId ?? student?.studentId;
const getEvaluationName = (evaluation) => evaluation?.titre || evaluation?.title || `Évaluation ${evaluation?.id}`;
const getEvaluationType = (evaluation) => {
  const rawValue = evaluation?.typeEval
    ?? evaluation?.type
    ?? evaluation?.typeEvaluation
    ?? evaluation?.evaluationType
    ?? evaluation?.nom
    ?? evaluation?.name;

  if (!rawValue) return '';

  const normalized = String(rawValue).trim();
  if (!normalized) return '';

  return normalized.toUpperCase();
};
const getEvaluationDisplay = (evaluation) => getEvaluationName(evaluation) || getEvaluationType(evaluation) || 'Évaluation';
const getSubjectName = (subject) => subject?.intitule || subject?.nom || subject?.name || `Matière ${subject?.id}`;
const getCurrentUserId = (profile) => profile?.professeurId
  ?? profile?.professeur?.id
  ?? profile?.user?.professeurId
  ?? profile?.id
  ?? profile?.userId
  ?? profile?.directeurId
  ?? profile?.user?.id
  ?? profile?.user?.userId;
const getNoteValue = (note) => note?.valeur ?? note?.value ?? note?.note ?? note?.noteValue;
const emptyNoteForm = { etudiantId: '', evaluationId: '', professeurId: '', valeur: '', dateSaisie: '', appreciation: '' };
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

const NotesPage = ({ directorMode = false }) => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [assignedClassIds, setAssignedClassIds] = useState([]);
  const [assignedSubjectIds, setAssignedSubjectIds] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [evaluations, setEvaluations] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteForm, setNoteForm] = useState(emptyNoteForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useGlobalMessage('error');
  const [successMessage, setSuccessMessage] = useGlobalMessage('success');
  const { userRole, userProfile } = useAuth();
  const isDirector = directorMode || userRole === 'ROLE_DIRECTEUR';

  const loadNotesPage = async (pendingNote = null) => {
    try {
      const [studentsResult, assignedClassesResult, classesResult, notesResult, evaluationsResult, teachersResult, sessionsResult, subjectsResult] = await Promise.allSettled(isDirector
        ? [getAllStudents(), Promise.resolve({ data: [] }), getAllClasses(), getAllNotes(), getAllEvaluations(), getAllTeachers(), Promise.resolve({ data: [] }), getAllMatieres()]
        : [getMesEtudiants(), getMesClasses(), getAllClasses(), getAllNotes(), getAllEvaluations(), Promise.resolve({ data: [] }), getMesSeances(), getAllMatieres()]);
      setStudents(studentsResult.status === 'fulfilled' ? toArray(studentsResult.value.data, ['data', 'content', 'students', 'items']) : []);
      const assignedClasses = assignedClassesResult.status === 'fulfilled'
        ? normalizeClasses(toArray(assignedClassesResult.value.data, ['data', 'content', 'classes', 'items']))
        : [];
      const allClasses = classesResult.status === 'fulfilled'
        ? toArray(classesResult.value.data, ['data', 'content', 'classes', 'items'])
        : [];
      const classesMap = new Map([...allClasses, ...assignedClasses].map((item) => [String(item.id), item]));
      setClasses([...classesMap.values()]);
      setAssignedClassIds(isDirector ? [] : assignedClasses.map((item) => String(item.id)));
      const loadedNotes = notesResult.status === 'fulfilled' ? toArray(notesResult.value.data, ['data', 'content', 'notes', 'items']) : [];
      setNotes(pendingNote && !loadedNotes.some((note) => pendingNote.id != null && String(note.id) === String(pendingNote.id))
        ? [...loadedNotes, pendingNote]
        : loadedNotes);
      const loadedEvaluations = evaluationsResult.status === 'fulfilled'
        ? toArray(evaluationsResult.value.data, ['data', 'content', 'evaluations', 'items'])
        : [];
      const sessions = sessionsResult.status === 'fulfilled'
        ? toArray(sessionsResult.value.data, ['data', 'content', 'seances', 'sessions', 'items'])
        : [];
      const subjectIds = [...new Set(sessions
        .map((session) => session.matiereId ?? session.matiere?.id ?? session.subjectId)
        .filter((id) => id != null)
        .map(String))];
      setAssignedSubjectIds(isDirector ? [] : subjectIds);
      setEvaluations(isDirector || !subjectIds.length
        ? loadedEvaluations
        : loadedEvaluations.filter((evaluation) => subjectIds.includes(String(evaluation.matiereId ?? evaluation.matiere?.id))));
      setTeachers(teachersResult.status === 'fulfilled'
        ? toArray(teachersResult.value.data, ['data', 'content', 'professeurs', 'teachers', 'items'])
        : []);
      setSubjects(subjectsResult.status === 'fulfilled'
        ? toArray(subjectsResult.value.data, ['data', 'content', 'matieres', 'subjects', 'items'])
        : []);
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
  const availableClasses = classes.filter((classItem) => (
    (isDirector || assignedClassIds.includes(String(classItem.id)))
      && (!selectedLevel || String(getClassLevel(classItem)) === String(selectedLevel))
  ));
  const filteredStudents = students.filter((student) => {
    if (!selectedLevel && !selectedClassId) return true;

    const studentClassId = getClassId(student);
    const studentClass = classes.find((classItem) => String(classItem.id) === String(studentClassId));
    if (selectedLevel && (!studentClass || String(getClassLevel(studentClass)) !== String(selectedLevel))) return false;
    if (selectedClassId && String(studentClassId) !== String(selectedClassId)) return false;
    return true;
  });

  const handleNoteFormChange = (event) => {
    const { name, value } = event.target;
    setNoteForm((current) => ({ ...current, [name]: value }));
  };

  const startEditingNote = (note) => {
    const student = getNoteStudentRecord(note);
    const evaluation = getNoteEvaluation(note);
    setEditingNoteId(note.id);
    setSelectedLevel(getClassLevel(getStudentClass(student)));
    setSelectedClassId(String(getClassId(student) || ''));
    setNoteForm({
      etudiantId: String(getStudentId(student) || getNoteStudentId(note) || ''),
      evaluationId: String(note.evaluationId || evaluation.id || ''),
      professeurId: String(note.professeurId || ''),
      valeur: getNoteValue(note) ?? '',
      dateSaisie: note.dateSaisie || note.date || '',
      appreciation: note.appreciation || '',
    });
    setErrorMessage('');
    setSuccessMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteNote = async (note) => {
    if (!note.id || !window.confirm('Voulez-vous vraiment supprimer cette note ?')) return;

    try {
      await deleteNote(note.id);
      setNotes((currentNotes) => currentNotes.filter((item) => item.id !== note.id));
      setSuccessMessage('Note supprimée avec succès.');
    } catch (error) {
      console.error('Failed to delete note:', error);
      setErrorMessage(error.response?.data?.message || 'Impossible de supprimer la note.');
    }
  };

  const handleNoteSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    const value = Number(noteForm.valeur);

    if (!selectedLevel || !selectedClassId || !noteForm.etudiantId || !noteForm.evaluationId || (isDirector && !noteForm.professeurId) || !noteForm.dateSaisie || Number.isNaN(value) || value < 0 || value > 20) {
      setErrorMessage('Sélectionnez le niveau, la classe, l’étudiant, l’évaluation, le professeur référent, la date et une note entre 0 et 20.');
      return;
    }

    setSaving(true);
    try {
      const currentUserId = getCurrentUserId(userProfile);
      if (!isDirector && !currentUserId) {
        throw new Error('Impossible d’identifier le responsable de la saisie. Reconnectez-vous puis réessayez.');
      }

      const selectedStudent = students.find((student) => String(getStudentId(student)) === String(noteForm.etudiantId));
      const payload = {
        etudiantId: Number(noteForm.etudiantId),
        evaluationId: Number(noteForm.evaluationId),
        valeur: value,
        dateSaisie: noteForm.dateSaisie,
        appreciation: noteForm.appreciation.trim(),
        professeurId: Number(isDirector ? noteForm.professeurId : currentUserId),
      };
      const { data: createdNote } = editingNoteId
        ? await updateNote(editingNoteId, payload)
        : await addNote(payload);

      const noteToDisplay = {
        ...(createdNote || {}),
        etudiantId: createdNote?.etudiantId ?? Number(noteForm.etudiantId),
        evaluationId: createdNote?.evaluationId ?? Number(noteForm.evaluationId),
        valeur: createdNote?.valeur ?? value,
        etudiant: createdNote?.etudiant || selectedStudent,
      };
      setNotes((currentNotes) => editingNoteId
        ? currentNotes.map((note) => (note.id === editingNoteId ? { ...note, ...noteToDisplay, id: editingNoteId } : note))
        : [...currentNotes.filter((note) => note.id !== noteToDisplay.id), noteToDisplay]);
      await loadNotesPage(noteToDisplay);
      setSuccessMessage(editingNoteId ? 'Note modifiée avec succès.' : 'Note ajoutée avec succès.');
      setEditingNoteId(null);
      setNoteForm((current) => ({ ...current, valeur: '', dateSaisie: '', appreciation: '' }));
    } catch (error) {
      console.error('Failed to save note:', error);
      setErrorMessage(error.response?.data?.message || 'Impossible d\'enregistrer la note.');
    } finally {
      setSaving(false);
    }
  };

  const getNoteStudentId = (note) => {
    const noteStudent = getNoteStudent(note);
    return note.etudiantId ?? note.studentId ?? note.eleveId ?? noteStudent.id;
  };

  const getNoteStudentRecord = (note) => {
    const noteStudent = getNoteStudent(note);
    const noteStudentId = getNoteStudentId(note);
    return students.find((student) => String(getStudentId(student)) === String(noteStudentId)) || noteStudent;
  };

  const getNoteSubjectId = (note) => {
    const evaluation = note.evaluation || evaluations.find((item) => String(item.id) === String(note.evaluationId));
    return note.matiereId ?? note.subjectId ?? evaluation?.matiereId ?? evaluation?.matiere?.id;
  };

  const getNoteEvaluation = (note) => note.evaluation || evaluations.find((item) => String(item.id) === String(note.evaluationId)) || {};
  const getNoteSubject = (note) => {
    const evaluation = getNoteEvaluation(note);
    const subjectId = getNoteSubjectId(note);
    return note.matiere || note.subject || evaluation.matiere || subjects.find((subject) => String(subject.id) === String(subjectId));
  };
  const getNoteCoefficient = (note) => getNoteSubject(note)?.coefficient ?? getNoteEvaluation(note).coefficient;

  const visibleNotes = notes.filter((note) => {
    const student = getNoteStudentRecord(note);
    const studentId = getStudentId(student);
    const studentClassId = getClassId(student);
    const studentClass = classes.find((classItem) => String(classItem.id) === String(studentClassId));
    const isAssignedStudent = isDirector || students.some((item) => String(getStudentId(item)) === String(studentId));
    const noteSubjectId = getNoteSubjectId(note);
    const isAssignedSubject = isDirector || (noteSubjectId != null && assignedSubjectIds.includes(String(noteSubjectId)));

    return isAssignedStudent
      && isAssignedSubject
      && (!selectedLevel || String(getClassLevel(studentClass)) === String(selectedLevel))
      && (isDirector || assignedClassIds.includes(String(studentClassId)))
      && (!selectedClassId || String(studentClassId) === String(selectedClassId));
  });

  const columns = [
    { key: 'student', label: 'Étudiant', render: (row) => getName(getNoteStudentRecord(row)) },
    { key: 'email', label: 'Email', render: (row) => getStudentEmail(getNoteStudentRecord(row)) || '—' },
    { key: 'cne', label: 'CNE', render: (row) => getNoteStudentRecord(row)?.cne || '—' },
    { key: 'classe', label: 'Classe', render: (row) => getStudentClass(getNoteStudentRecord(row))?.nom || '—' },
    { key: 'matiere', label: 'Matière', render: (row) => getSubjectName(getNoteSubject(row)) },
    { key: 'valeur', label: 'Note', render: (row) => <span className="notes-score-badge">{getNoteValue(row) ?? '—'}/20</span> },
    { key: 'coefficient', label: 'Coefficient', render: (row) => <span className="notes-coefficient-badge">{getNoteCoefficient(row) ?? '—'}</span> },
    {
      key: 'evaluation',
      label: 'Évaluation',
      render: (row) => getEvaluationDisplay(getNoteEvaluation(row)),
    },
    { key: 'dateSaisie', label: 'Date', render: (row) => row.dateSaisie || row.date || 'Date non renseignée' },
    { key: 'appreciation', label: 'Appréciation', render: (row) => row.appreciation || '—' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="notes-table-actions">
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => startEditingNote(row)} title="Modifier la note">
            <i className="bi bi-pencil-square" />
          </button>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteNote(row)} title="Supprimer la note">
            <i className="bi bi-trash3" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <header className="page-header">
        <div className="page-title-row"><h1>{isDirector ? 'Saisie des Notes - Direction' : 'Saisie des Notes'}</h1></div>
        <p className="page-subtitle">Consultez et saisissez les notes de vos étudiants.</p>
      </header>

      <div className="app-card rounded-card p-4 mb-4">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Niveau</label>
            <select className="form-select" value={selectedLevel} onChange={(event) => { setSelectedLevel(event.target.value); setSelectedClassId(''); setNoteForm((current) => ({ ...current, etudiantId: '' })); }}>
              <option value="">Choisir un niveau</option>
              {availableLevels.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label">Classe</label>
            <select className="form-select" value={selectedClassId} onChange={(event) => { setSelectedClassId(event.target.value); setNoteForm((current) => ({ ...current, etudiantId: '' })); }} disabled={!selectedLevel}>
              <option value="">{selectedLevel ? 'Choisir une classe' : 'Choisir un niveau d’abord'}</option>
              {availableClasses.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.nom || `Classe ${classItem.id}`}</option>)}
            </select>
          </div>
        </div>
      </div>

      <form className="app-card rounded-card p-4 mb-4" onSubmit={handleNoteSubmit}>
          <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
            <h2 className="h5 mb-0">{editingNoteId ? 'Modifier la note' : 'Ajouter une note'}</h2>
            {editingNoteId && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setEditingNoteId(null); setNoteForm(emptyNoteForm); }}>Annuler</button>}
          </div>
          <div className="row g-3 align-items-end">
            <div className="col-md-2">
              <label className="form-label" htmlFor="note-student">Étudiant</label>
              <select id="note-student" name="etudiantId" className="form-select" value={noteForm.etudiantId} onChange={handleNoteFormChange} disabled={!selectedLevel || !selectedClassId} required>
                <option value="">{selectedLevel && selectedClassId ? 'Choisir un étudiant' : 'Choisir le niveau et la classe d’abord'}</option>
                {filteredStudents.map((student) => <option key={getStudentId(student)} value={getStudentId(student)}>{getName(student)}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="note-evaluation">Évaluation</label>
              <select id="note-evaluation" name="evaluationId" className="form-select" value={noteForm.evaluationId} onChange={handleNoteFormChange} required>
                <option value="">Choisir une évaluation</option>
                {evaluations.map((evaluation) => <option key={evaluation.id} value={evaluation.id}>{getEvaluationName(evaluation)}</option>)}
              </select>
            </div>
            {isDirector && (
              <div className="col-md-2">
                <label className="form-label" htmlFor="note-teacher">Professeur référent</label>
                <select id="note-teacher" name="professeurId" className="form-select" value={noteForm.professeurId || ''} onChange={handleNoteFormChange} required>
                  <option value="">Choisir</option>
                  {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{getName(teacher)}</option>)}
                </select>
              </div>
            )}
            <div className="col-md-1">
              <label className="form-label" htmlFor="note-value">Note / 20</label>
              <input id="note-value" name="valeur" className="form-control" type="number" min="0" max="20" step="0.01" value={noteForm.valeur} onChange={handleNoteFormChange} required />
            </div>
            <div className="col-md-2">
              <label className="form-label" htmlFor="note-date">Date</label>
              <input id="note-date" name="dateSaisie" className="form-control" type="date" value={noteForm.dateSaisie} onChange={handleNoteFormChange} required />
            </div>
            <div className="col-md-2">
              <label className="form-label" htmlFor="note-appreciation">Appréciation</label>
              <input id="note-appreciation" name="appreciation" className="form-control" type="text" value={noteForm.appreciation} onChange={handleNoteFormChange} placeholder="Ex: Très bien" />
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary w-100" type="submit" disabled={saving}>{saving ? 'Enregistrement...' : editingNoteId ? 'Modifier' : 'Ajouter'}</button>
            </div>
          </div>
      </form>

      {loading ? <div className="app-card rounded-card p-4 text-center">Chargement des notes...</div> : <DataTable columns={columns} rows={visibleNotes} emptyMessage="Aucune note trouvée pour cette classe." showEmptyTable tableClassName="notes-table" />}
      {errorMessage && <div className="alert alert-danger mt-3" role="alert">{errorMessage}</div>}
      {successMessage && <div className="alert alert-success mt-3" role="alert">{successMessage}</div>}
    </>
  );
};

export default NotesPage;
