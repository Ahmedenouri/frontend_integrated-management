import { useEffect, useState } from 'react';
import {
  createAbsence,
  addSanction,
  deleteSanction,
  deleteAbsence,
  getAllAbsences,
  getAllClasses,
  getAllSeances,
  getAllStudents,
  getAllSurveillants,
  getDashboardDiscipline,
  getAllSanctions,
  updateSanction,
  updateAbsence,
} from '../api/erpApi';
import DataTable from '../components/DataTable';
import { useGlobalMessage } from '../utils/notifications';

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

const getStudentLevel = (student, classItem) => student?.niveau || student?.niveauEtude || classItem?.niveau || '';

const AttendancePage = () => {
  const [stats, setStats] = useState(null);
  const [absences, setAbsences] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [sanctions, setSanctions] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isSanctionSearchOpen, setIsSanctionSearchOpen] = useState(false);
  const [sanctionSearch, setSanctionSearch] = useState('');
  const [sanctionForm, setSanctionForm] = useState({
    type: 'AVERTISSEMENT',
    motif: '',
    dateEmission: '',
    estTraitee: false,
  });
  const [sanctionSaving, setSanctionSaving] = useState(false);
  const [editingSanctionId, setEditingSanctionId] = useState(null);
  const [pendingDeleteSanction, setPendingDeleteSanction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useGlobalMessage('error');
  const [successMessage, setSuccessMessage] = useGlobalMessage('success');

  const loadAttendance = async () => {
    try {
      const [disciplineResult, absencesResult, studentsResult, sessionsResult, supervisorsResult, classesResult, sanctionsResult] = await Promise.allSettled([
        getDashboardDiscipline(),
        getAllAbsences(),
        getAllStudents(),
        getAllSeances(),
        getAllSurveillants(),
        getAllClasses(),
        getAllSanctions(),
      ]);

      const disciplineData = disciplineResult.status === 'fulfilled' ? disciplineResult.value.data : {};
      const absencesData = absencesResult.status === 'fulfilled' ? absencesResult.value.data : [];
      const studentsData = asArray(studentsResult.status === 'fulfilled' ? studentsResult.value.data : []);
      const sessionsData = asArray(sessionsResult.status === 'fulfilled' ? sessionsResult.value.data : []);
      const supervisorsData = asArray(supervisorsResult.status === 'fulfilled' ? supervisorsResult.value.data : []);
      const classesData = asArray(classesResult.status === 'fulfilled' ? classesResult.value.data : []);
      const sanctionsData = asArray(sanctionsResult.status === 'fulfilled' ? sanctionsResult.value.data : []);
      const studentMap = new Map(studentsData.map((student) => [String(student.id), student]));
      const sessionMap = new Map(sessionsData.map((session) => [String(session.id), session]));
      const supervisorMap = new Map(supervisorsData.map((supervisor) => [String(supervisor.id), supervisor]));

      setStats(disciplineData || {});
      setStudents(studentsData);
      setSessions(sessionsData);
      setSupervisors(supervisorsData);
      setClasses(classesData);
      setSanctions(sanctionsData);
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
    // The loader is intentionally run once when the page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedStudents = students.filter((student) => !form.classeId || String(student.classeId) === String(form.classeId));

  const selectedClass = classes.find((classItem) => String(classItem.id) === String(selectedClassId));
  const levels = [...new Set(students
    .filter((student) => String(student.classeId) === String(selectedClassId))
    .map((student) => getStudentLevel(student, selectedClass))
    .filter(Boolean))];
  const filteredStudents = students.filter((student) => (
    String(student.classeId) === String(selectedClassId)
    && (!selectedLevel || getStudentLevel(student, selectedClass) === selectedLevel)
  ));
  const selectedStudent = students.find((student) => String(student.id) === String(selectedStudentId));
  const selectedStudentAbsences = absences.filter((absence) => String(absence.etudiantId) === String(selectedStudentId));
  const selectedStudentSanctions = sanctions.filter((sanction) => String(sanction.etudiantId) === String(selectedStudentId));
  const totalStudentAbsenceHours = selectedStudentAbsences.reduce((total, absence) => total + Number(absence.nombreHeures || 0), 0);
  const searchedStudents = students.filter((student) => {
    const searchValue = sanctionSearch.trim().toLowerCase();
    if (!searchValue) return false;
    return [student.nom, student.prenom, student.email]
      .some((value) => String(value ?? '').toLowerCase().includes(searchValue));
  }).slice(0, 8);

  const selectSearchedStudent = (student) => {
    const studentClass = classes.find((classItem) => String(classItem.id) === String(student.classeId));
    setSelectedClassId(String(student.classeId || ''));
    setSelectedLevel(getStudentLevel(student, studentClass));
    setSelectedStudentId(String(student.id));
    setSanctionSearch(`${student.prenom || ''} ${student.nom || ''}`.trim());
  };

  const handleSanctionSubmit = async (event) => {
    event.preventDefault();
    setSanctionSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (!selectedStudentId || !sanctionForm.dateEmission || !sanctionForm.motif.trim()) {
        throw new Error('Étudiant, date et motif de sanction sont obligatoires.');
      }

      const absenceSupervisorId = selectedStudentAbsences.find((absence) => absence.surveillantId)?.surveillantId;
      const payload = {
        ...sanctionForm,
        motif: sanctionForm.motif.trim(),
        totalAbsencesAuMoment: totalStudentAbsenceHours,
        etudiantId: Number(selectedStudentId),
        ...(absenceSupervisorId ? { surveillantId: Number(absenceSupervisorId) } : {}),
      };

      if (editingSanctionId) {
        await updateSanction(editingSanctionId, payload);
        setSuccessMessage('Sanction mise à jour avec succès.');
      } else {
        await addSanction(payload);
        setSuccessMessage('Sanction enregistrée avec succès.');
      }
      setSanctionForm({ type: 'AVERTISSEMENT', motif: '', dateEmission: '', estTraitee: false });
      setEditingSanctionId(null);
      await loadAttendance();
    } catch (error) {
      console.error('Failed to save sanction:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'Impossible d’enregistrer la sanction.');
    } finally {
      setSanctionSaving(false);
    }
  };

  const openEditSanction = (sanction) => {
    setEditingSanctionId(sanction.id);
    setSanctionForm({
      type: sanction.type || 'AVERTISSEMENT',
      motif: sanction.motif || '',
      dateEmission: sanction.dateEmission || '',
      estTraitee: Boolean(sanction.estTraitee),
    });
    setErrorMessage('');
    setSuccessMessage('');
  };

  const openDeleteSanction = (sanction) => setPendingDeleteSanction(sanction);

  const closeDeleteSanction = () => setPendingDeleteSanction(null);

  const handleDeleteSanction = async () => {
    if (!pendingDeleteSanction) return;

    try {
      await deleteSanction(pendingDeleteSanction.id);
      closeDeleteSanction();
      setSuccessMessage('Sanction supprimée avec succès.');
      await loadAttendance();
    } catch (error) {
      console.error('Failed to delete sanction:', error);
      setErrorMessage(error.response?.data?.message || 'Impossible de supprimer la sanction.');
      closeDeleteSanction();
    }
  };

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
    { key: 'dateAbsence', label: 'Date absence', render: (row) => formatDate(row.dateAbsence) },
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
        <div className="d-flex flex-column align-items-start gap-2">
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
      <div className={`page-shell ${isFormModalOpen || isDeleteModalOpen || pendingDeleteSanction ? 'page-blur' : ''}`}>
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

          <section className="app-card rounded-card p-4 mb-4">
            <div className="card-header px-0 pt-0 d-flex align-items-start justify-content-between gap-3">
              <div>
                <h3>Sanctionner un étudiant</h3>
                <p className="text-muted mb-0">Choisissez une classe, un niveau puis l’étudiant pour consulter son dossier disciplinaire.</p>
              </div>
              <button
                className="btn btn-sm btn-outline-primary"
                type="button"
                title="Rechercher un étudiant par nom ou email"
                aria-label="Rechercher un étudiant par nom ou email"
                onClick={() => setIsSanctionSearchOpen((current) => !current)}
              >
                <i className="bi bi-search" />
              </button>
            </div>

            {isSanctionSearchOpen && (
              <div className="position-relative mb-3" style={{ maxWidth: '360px' }}>
                <div className="input-group input-group-sm">
                  <span className="input-group-text"><i className="bi bi-search" /></span>
                  <input
                    className="form-control"
                    type="search"
                    autoFocus
                    placeholder="Nom ou email de l’étudiant"
                    value={sanctionSearch}
                    onChange={(event) => setSanctionSearch(event.target.value)}
                  />
                  <button className="btn btn-outline-secondary" type="button" onClick={() => { setSanctionSearch(''); setIsSanctionSearchOpen(false); }} aria-label="Fermer la recherche">
                    <i className="bi bi-x" />
                  </button>
                </div>
                {searchedStudents.length > 0 && (
                  <div className="list-group position-absolute w-100 shadow-sm" style={{ zIndex: 5 }}>
                    {searchedStudents.map((student) => (
                      <button className="list-group-item list-group-item-action text-start" type="button" key={student.id} onClick={() => selectSearchedStudent(student)}>
                        <strong>{getFullName(student)}</strong>
                        <small className="d-block text-muted">{student.email || 'Email non renseigné'}</small>
                      </button>
                    ))}
                  </div>
                )}
                {sanctionSearch.trim() && !searchedStudents.length && <small className="text-muted d-block mt-2">Aucun étudiant trouvé.</small>}
              </div>
            )}

            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <label className="form-label">Classe</label>
                <select
                  className="form-select"
                  value={selectedClassId}
                  onChange={(event) => {
                    setSelectedClassId(event.target.value);
                    setSelectedLevel('');
                    setSelectedStudentId('');
                  }}
                >
                  <option value="">Choisir une classe</option>
                  {classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.nom || `Classe ${classItem.id}`}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Niveau</label>
                <select
                  className="form-select"
                  value={selectedLevel}
                  onChange={(event) => {
                    setSelectedLevel(event.target.value);
                    setSelectedStudentId('');
                  }}
                  disabled={!selectedClassId}
                >
                  <option value="">{selectedClassId ? 'Choisir un niveau' : 'Choisir une classe d’abord'}</option>
                  {levels.map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Étudiant</label>
                <select
                  className="form-select"
                  value={selectedStudentId}
                  onChange={(event) => setSelectedStudentId(event.target.value)}
                  disabled={!selectedClassId || !selectedLevel}
                >
                  <option value="">{selectedLevel ? 'Choisir un étudiant' : 'Choisir un niveau d’abord'}</option>
                  {filteredStudents.map((student) => <option key={student.id} value={student.id}>{getFullName(student)}{student.email ? ` - ${student.email}` : ''}</option>)}
                </select>
              </div>
            </div>

            {selectedStudent && (
              <div className="row g-4">
                <div className="col-lg-5">
                  <div className="app-card rounded-card p-3 h-100">
                    <h4>{getFullName(selectedStudent)}</h4>
                    <p className="text-muted mb-3">{selectedStudent.email || 'Email non renseigné'}</p>
                    <div className="stats-grid">
                      <div className="stat-card">
                        <span className="stat-label">Total heures absence</span>
                        <span className="stat-value">{totalStudentAbsenceHours}</span>
                      </div>
                      <div className="stat-card">
                        <span className="stat-label">Nombre absences</span>
                        <span className="stat-value">{selectedStudentAbsences.length}</span>
                      </div>
                    </div>
                    <h5 className="mt-4">Détails des absences</h5>
                    <div className="table-responsive">
                      <table className="table table-sm align-middle">
                        <thead><tr><th>Date</th><th>Heures</th><th>Surveillant</th><th>Motif</th></tr></thead>
                        <tbody>
                          {selectedStudentAbsences.map((absence) => (
                            <tr key={absence.id}>
                              <td>{formatDate(absence.dateAbsence)}</td>
                              <td>{absence.nombreHeures ?? 0}</td>
                              <td>{getFullName(absence.supervisor) || absence.surveillantId || '—'}</td>
                              <td>{absence.motifJustification || 'Non justifiée'}</td>
                            </tr>
                          ))}
                          {!selectedStudentAbsences.length && <tr><td colSpan="4" className="text-muted">Aucune absence.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="col-lg-7">
                  <div className="app-card rounded-card p-3 h-100">
                    <h4>{editingSanctionId ? 'Mise à jour de la sanction' : 'Nouvelle sanction'}</h4>
                    <form onSubmit={handleSanctionSubmit}>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label">Type</label>
                          <select className="form-select" value={sanctionForm.type} onChange={(event) => setSanctionForm((current) => ({ ...current, type: event.target.value }))}>
                            <option value="CONVOCATION_PARENTS">Convocation parents</option>
                            <option value="CONSEIL_DISCIPLINE">Conseil de discipline</option>
                            <option value="AVERTISSEMENT">Avertissement</option>
                            <option value="EXCLUSION">Exclusion</option>
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Date émission</label>
                          <input className="form-control" type="date" value={sanctionForm.dateEmission} onChange={(event) => setSanctionForm((current) => ({ ...current, dateEmission: event.target.value }))} required />
                        </div>
                        <div className="col-12">
                          <label className="form-label">Motif de la sanction</label>
                          <textarea className="form-control" rows="3" value={sanctionForm.motif} onChange={(event) => setSanctionForm((current) => ({ ...current, motif: event.target.value }))} required />
                        </div>
                        <div className="col-12">
                          <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="sanctionTraitee" checked={sanctionForm.estTraitee} onChange={(event) => setSanctionForm((current) => ({ ...current, estTraitee: event.target.checked }))} />
                            <label className="form-check-label" htmlFor="sanctionTraitee">Sanction traitée</label>
                          </div>
                        </div>
                      </div>
                      <div className="d-flex gap-2 mt-3">
                        <button className="btn btn-primary" type="submit" disabled={sanctionSaving}>
                          {sanctionSaving ? 'Enregistrement...' : editingSanctionId ? 'Mettre à jour' : 'Enregistrer la sanction'}
                        </button>
                        {editingSanctionId && (
                          <button
                            className="btn btn-outline-secondary"
                            type="button"
                            onClick={() => {
                              setEditingSanctionId(null);
                              setSanctionForm({ type: 'AVERTISSEMENT', motif: '', dateEmission: '', estTraitee: false });
                            }}
                          >
                            Annuler la mise à jour
                          </button>
                        )}
                      </div>
                    </form>

                    <h5 className="mt-4">Sanctions précédentes</h5>
                    <div className="table-responsive">
                      <table className="table table-sm align-middle">
                        <thead><tr><th>Date</th><th>Type</th><th>Motif</th><th>Heures</th><th>Actions</th></tr></thead>
                        <tbody>
                          {selectedStudentSanctions.map((sanction) => (
                            <tr key={sanction.id}>
                              <td>{formatDate(sanction.dateEmission)}</td>
                              <td>{sanction.type}</td>
                              <td>{sanction.motif || '—'}</td>
                              <td>{sanction.totalAbsencesAuMoment ?? 0}</td>
                              <td>
                                <div className="d-flex gap-2">
                                  <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => openEditSanction(sanction)}>
                                    <i className="bi bi-pencil-square me-1" />
                                    Mise à jour
                                  </button>
                                  <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => openDeleteSanction(sanction)}>
                                    <i className="bi bi-trash3 me-1" />
                                    Supprimer
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {!selectedStudentSanctions.length && <tr><td colSpan="5" className="text-muted">Aucune sanction précédente.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
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

      {pendingDeleteSanction && (
        <div className="student-modal-backdrop" onClick={closeDeleteSanction}>
          <div className="student-modal confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-header">
              <h3>Supprimer la sanction</h3>
              <button className="btn-close" type="button" onClick={closeDeleteSanction} aria-label="Fermer" />
            </div>
            <div className="student-modal-body">
              <p className="mb-3">Êtes-vous sûr de vouloir supprimer cette sanction ?</p>
              <div className="student-modal-actions">
                <button className="btn btn-outline-secondary" type="button" onClick={closeDeleteSanction}>Annuler</button>
                <button className="btn btn-danger" type="button" onClick={handleDeleteSanction}>Supprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AttendancePage;
