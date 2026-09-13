import { useEffect, useState } from 'react';
import {
  createAbsence,
  deleteAbsence,
  getAllAbsences,
  getAllClasses,
  getAllSeances,
  getAllStudents,
  getAllSurveillants,
  getDashboardDiscipline,
  updateAbsence,
} from '../api/erpApi';
import DataTable from '../components/DataTable';

const initialForm = {
  classeId: '',
  etudiantId: '',
  dateAbsence: '',
  seanceId: '',
  nombreHeures: '1',
  estJustifiee: false,
  motifJustification: '',
  surveillantId: '',
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const getId = (value) => value?.id ?? value;

const getFullName = (person) => {
  if (!person) return null;
  const name = [person.prenom, person.nom].filter(Boolean).join(' ').trim();
  return name || person.name || null;
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('fr-FR');
};

const formatSession = (session) => {
  if (!session) return null;
  const time = [session.heureDebut, session.heureFin].filter(Boolean).join(' - ');
  return [session.jour, time].filter(Boolean).join(' | ');
};

const AttendancePage = () => {
  const [stats, setStats] = useState(null);
  const [absences, setAbsences] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadAttendance = async () => {
    try {
      const [disciplineResult, absencesResult, studentsResult, sessionsResult, supervisorsResult, classesResult] = await Promise.allSettled([
        getDashboardDiscipline(),
        getAllAbsences(),
        getAllStudents(),
        getAllSeances(),
        getAllSurveillants(),
        getAllClasses(),
      ]);

      const disciplineData = disciplineResult.status === 'fulfilled' ? disciplineResult.value.data : {};
      const absencesData = absencesResult.status === 'fulfilled' ? absencesResult.value.data : [];
      const studentsData = asArray(studentsResult.status === 'fulfilled' ? studentsResult.value.data : []);
      const sessionsData = asArray(sessionsResult.status === 'fulfilled' ? sessionsResult.value.data : []);
      const supervisorsData = asArray(supervisorsResult.status === 'fulfilled' ? supervisorsResult.value.data : []);
      const classesData = asArray(classesResult.status === 'fulfilled' ? classesResult.value.data : []);
      const studentMap = new Map(studentsData.map((student) => [String(student.id), student]));
      const sessionMap = new Map(sessionsData.map((session) => [String(session.id), session]));
      const supervisorMap = new Map(supervisorsData.map((supervisor) => [String(supervisor.id), supervisor]));

      setStats(disciplineData || {});
      setStudents(studentsData);
      setSessions(sessionsData);
      setSupervisors(supervisorsData);
      setClasses(classesData);
      setAbsences(asArray(absencesData).map((absence) => ({
        ...absence,
        student: absence.etudiant || studentMap.get(String(getId(absence.etudiantId))),
        session: absence.seance || sessionMap.get(String(getId(absence.seanceId))),
        supervisor: absence.surveillant || supervisorMap.get(String(getId(absence.surveillantId))),
      })));
    } catch (error) {
      console.error('Failed to load attendance data:', error);
      setErrorMessage('Impossible de charger les données des absences.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAttendance();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const selectedStudents = students.filter((student) => !form.classeId || String(student.classeId) === String(form.classeId));

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setErrorMessage('');
  };

  const openCreateModal = () => {
    resetForm();
    setSuccessMessage('');
    setIsFormModalOpen(true);
  };

  const openEditModal = (absence) => {
    const student = absence.student;
    setEditingId(absence.id);
    setForm({
      classeId: student?.classeId ? String(student.classeId) : '',
      etudiantId: absence.etudiantId ? String(absence.etudiantId) : '',
      dateAbsence: absence.dateAbsence || '',
      seanceId: absence.seanceId ? String(absence.seanceId) : '',
      nombreHeures: String(absence.nombreHeures ?? 1),
      estJustifiee: Boolean(absence.estJustifiee),
      motifJustification: absence.motifJustification || '',
      surveillantId: absence.surveillantId ? String(absence.surveillantId) : '',
    });
    setErrorMessage('');
    setSuccessMessage('');
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    resetForm();
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleClassChange = (event) => {
    setForm((current) => ({ ...current, classeId: event.target.value, etudiantId: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        dateAbsence: form.dateAbsence,
        etudiantId: Number(form.etudiantId),
        seanceId: Number(form.seanceId),
        nombreHeures: Number(form.nombreHeures),
        estJustifiee: form.estJustifiee,
        motifJustification: form.motifJustification.trim(),
        ...(form.surveillantId ? { surveillantId: Number(form.surveillantId) } : {}),
      };

      if (!payload.dateAbsence || !payload.etudiantId || !payload.seanceId || !payload.nombreHeures) {
        throw new Error('Date, étudiant, séance et nombre d’heures sont obligatoires.');
      }

      if (editingId) {
        await updateAbsence(editingId, payload);
        setSuccessMessage('Absence modifiée avec succès.');
      } else {
        await createAbsence(payload);
        setSuccessMessage('Absence ajoutée avec succès.');
      }

      closeFormModal();
      await loadAttendance();
    } catch (error) {
      console.error('Failed to save absence:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'Impossible d’enregistrer l’absence.');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (absence) => {
    setPendingDelete(absence);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setPendingDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;

    try {
      await deleteAbsence(pendingDelete.id);
      closeDeleteModal();
      setSuccessMessage('Absence supprimée avec succès.');
      await loadAttendance();
    } catch (error) {
      console.error('Failed to delete absence:', error);
      setErrorMessage(error.response?.data?.message || 'Impossible de supprimer l’absence.');
      closeDeleteModal();
    }
  };

  const columns = [
    { key: 'id', label: 'ID absence' },
    { key: 'dateAbsence', label: 'Date absence', render: (row) => formatDate(row.dateAbsence) },
    { key: 'etudiantId', label: 'ID étudiant' },
    { key: 'studentName', label: 'Nom et prénom', render: (row) => getFullName(row.student) || '—' },
    { key: 'studentEmail', label: 'Email', render: (row) => row.student?.email || '—' },
    { key: 'nombreHeures', label: 'Nombre heures' },
    { key: 'seance', label: 'Séance', render: (row) => formatSession(row.session) || row.seanceId || '—' },
    { key: 'surveillant', label: 'Surveillant', render: (row) => getFullName(row.supervisor) || row.surveillantId || '—' },
    {
      key: 'estJustifiee',
      label: 'Est justifiée',
      render: (row) => (
        <span className={`badge-soft ${row.estJustifiee ? 'success' : 'danger'}`}>
          {row.estJustifiee ? 'Oui' : 'Non'}
        </span>
      ),
    },
    { key: 'motifJustification', label: 'Motif justification' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => openEditModal(row)}>
            Modifier
          </button>
          <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => openDeleteModal(row)}>
            Supprimer
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className={`page-shell ${isFormModalOpen || isDeleteModalOpen ? 'page-blur' : ''}`}>
      <header className="page-header">
        <div className="page-title-row">
          <h1>Attendance</h1>
          <button className="btn btn-primary" type="button" onClick={openCreateModal}>
            Ajouter une absence
          </button>
        </div>
        <p className="page-subtitle">Liste complète des absences, étudiants, séances et justifications.</p>
      </header>

      {errorMessage && !isFormModalOpen && !isDeleteModalOpen && <div className="alert alert-danger">{errorMessage}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      {loading ? (
        <div className="app-card rounded-card p-4 text-center">Loading attendance data...</div>
      ) : (
        <>
          <section className="stats-grid mb-4">
            <div className="app-card stat-card rounded-card">
              <span className="stat-label">Total absences</span>
              <span className="stat-value">{stats?.totalAbsences ?? 0}</span>
            </div>
            <div className="app-card stat-card rounded-card">
              <span className="stat-label">Hours lost</span>
              <span className="stat-value">{stats?.totalHeuresAbsences ?? 0}</span>
            </div>
            <div className="app-card stat-card rounded-card">
              <span className="stat-label">Total sanctions</span>
              <span className="stat-value">{stats?.totalSanctions ?? 0}</span>
            </div>
          </section>

          <DataTable columns={columns} rows={absences} emptyMessage="No absences found." />
        </>
      )}
      </div>

      {isFormModalOpen && (
        <div className="student-modal-backdrop" onClick={closeFormModal}>
          <div className="student-modal student-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-visual">
              <div className="student-modal-visual-badge">VPI • Gestion scolaire</div>
              <h4>{editingId ? 'Modifier une absence' : 'Ajouter une absence'}</h4>
              <p>Sélectionnez d’abord la classe, puis l’étudiant concerné et les détails de son absence.</p>
            </div>
            <div className="student-modal-body">
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Classe</label>
                    <select className="form-select" name="classeId" value={form.classeId} onChange={handleClassChange} required>
                      <option value="">Choisir une classe</option>
                      {classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.nom || `Classe ${classItem.id}`}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Étudiant</label>
                    <select className="form-select" name="etudiantId" value={form.etudiantId} onChange={handleChange} required disabled={!form.classeId}>
                      <option value="">{form.classeId ? 'Choisir un étudiant' : 'Choisir une classe d’abord'}</option>
                      {selectedStudents.map((student) => <option key={student.id} value={student.id}>{getFullName(student)}{student.email ? ` - ${student.email}` : ''}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Date absence</label>
                    <input className="form-control" type="date" name="dateAbsence" value={form.dateAbsence} onChange={handleChange} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Séance</label>
                    <select className="form-select" name="seanceId" value={form.seanceId} onChange={handleChange} required>
                      <option value="">Choisir une séance</option>
                      {sessions.map((session) => <option key={session.id} value={session.id}>{formatSession(session) || `Séance ${session.id}`}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Nombre d’heures</label>
                    <input className="form-control" type="number" min="1" name="nombreHeures" value={form.nombreHeures} onChange={handleChange} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Surveillant</label>
                    <select className="form-select" name="surveillantId" value={form.surveillantId} onChange={handleChange}>
                      <option value="">Choisir un surveillant</option>
                      {supervisors.map((supervisor) => <option key={supervisor.id} value={supervisor.id}>{getFullName(supervisor) || supervisor.email}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" name="estJustifiee" id="estJustifiee" checked={form.estJustifiee} onChange={handleChange} />
                      <label className="form-check-label" htmlFor="estJustifiee">Absence justifiée</label>
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Motif de justification</label>
                    <textarea className="form-control" name="motifJustification" rows="3" value={form.motifJustification} onChange={handleChange} placeholder="Ex. certificat médical, rendez-vous..." />
                  </div>
                </div>
                {errorMessage && <div className="alert alert-danger mt-3 mb-0">{errorMessage}</div>}
                <div className="student-modal-actions mt-4">
                  <button className="btn btn-outline-secondary" type="button" onClick={closeFormModal}>Annuler</button>
                  <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Enregistrement...' : editingId ? 'Enregistrer les modifications' : 'Ajouter l’absence'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && pendingDelete && (
        <div className="student-modal-backdrop" onClick={closeDeleteModal}>
          <div className="student-modal confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-header">
              <h3>Confirmer la suppression</h3>
              <button className="btn-close" type="button" onClick={closeDeleteModal} aria-label="Fermer" />
            </div>
            <div className="student-modal-body">
              <p className="mb-3">Êtes-vous sûr de vouloir supprimer cette absence ?</p>
              <div className="student-modal-actions">
                <button className="btn btn-outline-secondary" type="button" onClick={closeDeleteModal}>Annuler</button>
                <button className="btn btn-danger" type="button" onClick={handleDelete}>Supprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AttendancePage;
