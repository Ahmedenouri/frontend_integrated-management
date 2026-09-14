import { useEffect, useState } from 'react';
import {
  addNote,
  getAllClasses,
  getAllEvaluations,
  getMesClasses,
  getMesEtudiants,
  getMesNotes,
  getMesSeances,
} from '../api/erpApi';
import DataTable from '../components/DataTable';
import { useAuth } from '../context/AuthContext';
import { useGlobalMessage } from '../utils/notifications';

const initialForm = {
  valeur: '',
  appreciation: '',
  dateSaisie: '',
  evaluationId: '',
};

const getClassId = (student) => student?.classeId ?? student?.classe?.id ?? student?.classe;
const getName = (student) => [student?.nom, student?.prenom].filter(Boolean).join(' ') || '—';
const normalizeClasses = (items) => items.map((item) => item.classe || item.class || item).filter((item) => item?.id != null);

const NotesPage = () => {
  const { userProfile } = useAuth();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [taughtSubjectIds, setTaughtSubjectIds] = useState(new Set());
  const [notes, setNotes] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useGlobalMessage('error');
  const [successMessage, setSuccessMessage] = useGlobalMessage('success');

  const loadNotesPage = async () => {
    try {
      const [studentsResult, assignedClassesResult, classesResult, evaluationsResult, notesResult, sessionsResult] = await Promise.allSettled([
        getMesEtudiants(),
        getMesClasses(),
        getAllClasses(),
        getAllEvaluations(),
        getMesNotes(),
        getMesSeances(),
      ]);
      setStudents(studentsResult.status === 'fulfilled' && Array.isArray(studentsResult.value.data) ? studentsResult.value.data : []);
      const assignedClasses = assignedClassesResult.status === 'fulfilled' && Array.isArray(assignedClassesResult.value.data)
        ? normalizeClasses(assignedClassesResult.value.data)
        : [];
      const allClasses = classesResult.status === 'fulfilled' && Array.isArray(classesResult.value.data)
        ? classesResult.value.data
        : [];
      const classesMap = new Map([...allClasses, ...assignedClasses].map((item) => [String(item.id), item]));
      setClasses([...classesMap.values()]);
      setEvaluations(evaluationsResult.status === 'fulfilled' && Array.isArray(evaluationsResult.value.data) ? evaluationsResult.value.data : []);
      setNotes(notesResult.status === 'fulfilled' && Array.isArray(notesResult.value.data) ? notesResult.value.data : []);
      setTaughtSubjectIds(new Set(
        sessionsResult.status === 'fulfilled' && Array.isArray(sessionsResult.value.data)
          ? sessionsResult.value.data.map((session) => String(session.matiereId)).filter(Boolean)
          : []
      ));
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
  const availableEvaluations = evaluations.filter((evaluation) => taughtSubjectIds.has(String(evaluation.matiereId)));
  const evaluationMap = new Map(evaluations.map((evaluation) => [String(evaluation.id), evaluation]));
  const studentMap = new Map(students.map((student) => [String(student.id), student]));

  const openStudent = (student) => {
    setSelectedStudent(student);
    setForm(initialForm);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const resetNoteForm = () => {
    setForm(initialForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const studentId = Number(selectedStudent?.id);
      const professorId = Number(userProfile?.id);
      const evaluationId = Number(form.evaluationId);
      const value = Number(form.valeur);
      const payload = {
        valeur: value,
        appreciation: form.appreciation.trim(),
        dateSaisie: form.dateSaisie,
        etudiantId: studentId,
        professeurId: professorId,
        evaluationId,
      };
      if (!Number.isFinite(value) || value < 0 || value > 20) {
        throw new Error('La note doit être comprise entre 0 et 20.');
      }
      if (!form.dateSaisie || !evaluationId) {
        throw new Error('Évaluation et date sont obligatoires.');
      }
      if (!availableEvaluations.length) {
        throw new Error('Aucune évaluation autorisée pour les matières que vous enseignez.');
      }
      if (!studentId || !professorId) {
        throw new Error('Impossible d’identifier l’étudiant ou le professeur.');
      }
      await addNote(payload);
      setSuccessMessage('Note ajoutée avec succès.');
      resetNoteForm();
      await loadNotesPage();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || error.message || 'Impossible d’enregistrer la note.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'nom', label: 'Étudiant', render: (row) => getName(row) },
    { key: 'email', label: 'Email' },
    { key: 'cne', label: 'CNE' },
    { key: 'classe', label: 'Classe', render: (row) => getStudentClass(row)?.nom || '—' },
    { key: 'actions', label: 'Suivi', render: (row) => <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => openStudent(row)}><i className="bi bi-eye me-1" />Suivi</button> },
  ];

  const noteColumns = [
    { key: 'student', label: 'Étudiant', render: (row) => getName(studentMap.get(String(row.etudiantId))) },
    { key: 'evaluation', label: 'Évaluation', render: (row) => evaluationMap.get(String(row.evaluationId))?.titre || `Évaluation ${row.evaluationId}` },
    { key: 'valeur', label: 'Note', render: (row) => `${row.valeur}/20` },
    { key: 'appreciation', label: 'Appréciation', render: (row) => row.appreciation || '—' },
    { key: 'dateSaisie', label: 'Date' },
  ];

  return (
    <>
      <header className="page-header">
        <div className="page-title-row"><h1>Saisie des Notes</h1></div>
        <p className="page-subtitle">Consultez et saisissez les notes de vos étudiants.</p>
      </header>

      {loading ? <div className="app-card rounded-card p-4 text-center">Chargement des étudiants...</div> : <DataTable columns={columns} rows={students} emptyMessage="Aucun étudiant affecté." />}
      <section className="mt-4"><h3>Notes saisies par vous</h3><DataTable columns={noteColumns} rows={notes} emptyMessage="Aucune note saisie." /></section>
      {errorMessage && <div className="alert alert-danger mt-3" role="alert">{errorMessage}</div>}
      {successMessage && <div className="alert alert-success mt-3" role="alert">{successMessage}</div>}

      {selectedStudent && (
        <div className="student-modal-backdrop" onClick={() => setSelectedStudent(null)}>
          <div className="notes-entry-panel" onClick={(event) => event.stopPropagation()}>
            <div className="notes-entry-header"><div><small>Suivi étudiant</small><h2>{getName(selectedStudent)}</h2><p>{selectedStudent.email || 'Email non renseigné'}</p></div><button className="btn-close btn-close-white" type="button" onClick={() => setSelectedStudent(null)} aria-label="Fermer" /></div>
            <div className="notes-entry-body">
              {successMessage && <div className="alert alert-success" role="alert">{successMessage}</div>}
              {errorMessage && <div className="alert alert-danger" role="alert">{errorMessage}</div>}
              <div className="notes-student-summary"><span>Classe</span><strong>{getStudentClass(selectedStudent)?.nom || '—'}</strong><span>Email</span><strong>{selectedStudent.email || '—'}</strong></div>
              <form onSubmit={handleSubmit} className="notes-form"><h4>Ajouter une note</h4>{!availableEvaluations.length && <div className="alert alert-warning" role="alert">Aucune évaluation autorisée pour les matières que vous enseignez.</div>}<div className="row g-3"><div className="col-md-6"><label className="form-label">Évaluation</label><select className="form-select" value={form.evaluationId} onChange={(event) => setForm({ ...form, evaluationId: event.target.value })} required><option value="">Choisir une évaluation</option>{availableEvaluations.map((item) => <option key={item.id} value={item.id}>{item.titre} - {item.typeEval}</option>)}</select></div><div className="col-md-3"><label className="form-label">Note</label><input className="form-control" type="number" min="0" max="20" step="0.01" value={form.valeur} onChange={(event) => setForm({ ...form, valeur: event.target.value })} required /></div><div className="col-md-3"><label className="form-label">Date</label><input className="form-control" type="date" value={form.dateSaisie} onChange={(event) => setForm({ ...form, dateSaisie: event.target.value })} required /></div><div className="col-12"><label className="form-label">Appréciation</label><textarea className="form-control" rows="2" value={form.appreciation} onChange={(event) => setForm({ ...form, appreciation: event.target.value })} /></div></div><div className="student-modal-actions"><button className="btn btn-light" type="button" onClick={resetNoteForm}>Réinitialiser</button><button className="btn btn-primary" type="submit" disabled={saving || !availableEvaluations.length}>{saving ? 'Enregistrement...' : 'Ajouter la note'}</button></div></form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotesPage;
