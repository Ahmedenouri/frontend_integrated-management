import { useEffect, useState } from 'react';
import {
  createMatiere,
  deleteMatiere,
  getAllClasses,
  getAllMatieres,
  getMesClasses,
  getMesSeances,
  getMonEmploiDuTemps,
  updateMatiere,
} from '../api/erpApi';
import DataTable from '../components/DataTable';
import { useAuth } from '../context/AuthContext';
import { useGlobalMessage } from '../utils/notifications';

const initialForm = {
  code: '',
  intitule: '',
  coefficient: '',
  volumeHoraire: '',
};

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

const getClassLabel = (classItem) => {
  if (typeof classItem === 'string' || typeof classItem === 'number') return String(classItem);
  return classItem?.nom || classItem?.name || classItem?.classeNom || classItem?.classeName || classItem?.className || classItem?.classe?.nom || classItem?.class?.nom || '';
};
const getClassKey = (classItem) => String(classItem?.id ?? getClassLabel(classItem));

const SubjectsPage = () => {
  const { userRole } = useAuth();
  const isProfessor = userRole === 'ROLE_PROFESSEUR';
  const [subjects, setSubjects] = useState([]);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [assignedLoading, setAssignedLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useGlobalMessage('error');
  const [successMessage, setSuccessMessage] = useGlobalMessage('success');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeleteSubject, setPendingDeleteSubject] = useState(null);

  const loadSubjects = async () => {
    try {
      if (isProfessor) {
        const [subjectsResult, sessionsResult, timetablesResult, classesResult, assignmentsResult] = await Promise.allSettled([
          getAllMatieres(),
          getMesSeances(),
          getMonEmploiDuTemps(),
          getAllClasses(),
          getMesClasses(),
        ]);
        const allSubjects = subjectsResult.status === 'fulfilled' ? toArray(subjectsResult.value.data, ['data', 'content', 'matieres', 'subjects', 'items']) : [];
        const sessions = sessionsResult.status === 'fulfilled' ? toArray(sessionsResult.value.data, ['data', 'content', 'sessions', 'seances', 'items']) : [];
        const timetables = timetablesResult.status === 'fulfilled' ? toArray(timetablesResult.value.data, ['data', 'content', 'emploisDuTemps', 'items']) : [];
        const classes = classesResult.status === 'fulfilled' ? toArray(classesResult.value.data, ['data', 'content', 'classes', 'items']) : [];
        const assignments = assignmentsResult.status === 'fulfilled' ? toArray(assignmentsResult.value.data, ['data', 'content', 'assignments', 'items']) : [];
        const timetableMap = new Map(timetables.map((item) => [String(item.id), item]));
        const subjectMap = new Map(allSubjects.map((item) => [String(item.id), item]));
        const grouped = new Map();

        sessions.forEach((session) => {
          const subject = subjectMap.get(String(session.matiereId)) || session.matiere || {
            id: session.matiereId || session.matiereNom,
            intitule: session.matiereNom || session.matiere?.intitule || session.matiere?.nom,
          };
          if (!subject) return;
          const timetable = timetableMap.get(String(session.emploiDuTempsId));
          const classId = timetable?.classeId || session.classeId;
          const className = session.classeNom || session.classeName || session.className || timetable?.classeNom || timetable?.classeName || timetable?.className;
          const classItem = classes.find((item) => String(item.id) === String(classId)) || session.classe || timetable?.classe || (className ? { id: classId || className, nom: className } : null);
          const key = String(subject.id || subject.intitule);
          const current = grouped.get(key) || { ...subject, assignedClasses: [], weeklyHours: 0 };
          if (classItem && !current.assignedClasses.some((item) => getClassKey(item) === getClassKey(classItem))) current.assignedClasses.push(classItem);
          current.weeklyHours += Number(subject.volumeHoraire || 0);
          grouped.set(key, current);
        });

        assignments.forEach((assignment) => {
          const subjectId = assignment.matiereId || assignment.matiere?.id;
          const subject = subjectMap.get(String(subjectId)) || assignment.matiere || (assignment.matiereNom ? { id: subjectId || assignment.matiereNom, intitule: assignment.matiereNom } : null);
          if (!subject) return;
          const current = grouped.get(String(subject.id)) || { ...subject, assignedClasses: [], weeklyHours: 0 };
          const classId = assignment.classeId || assignment.classe?.id;
          const className = assignment.classeNom || assignment.classeName || assignment.className;
          const classItem = classes.find((item) => String(item.id) === String(classId)) || assignment.classe || (className ? { id: classId || className, nom: className } : null);
          if (classItem && !current.assignedClasses.some((item) => getClassKey(item) === getClassKey(classItem))) current.assignedClasses.push(classItem);
          grouped.set(String(subject.id), current);
        });

        setAssignedSubjects([...grouped.values()].map((subject) => ({
          ...subject,
          weeklyHours: subject.weeklyHours || subject.volumeHoraire || 0,
        })));
        setAssignedLoading(false);
        return;
      }
      const { data } = await getAllMatieres();
      setSubjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load subjects:', error);
      setErrorMessage('Impossible de charger les matières.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadSubjects();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProfessor]);

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

  const openEditModal = (subject) => {
    setEditingId(subject.id);
    setForm({
      code: subject.code || '',
      intitule: subject.intitule || '',
      coefficient: subject.coefficient ?? '',
      volumeHoraire: subject.volumeHoraire ?? '',
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
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        code: form.code.trim(),
        intitule: form.intitule.trim(),
        coefficient: Number(form.coefficient),
        volumeHoraire: Number(form.volumeHoraire),
      };

      if (!payload.code || !payload.intitule || Number.isNaN(payload.coefficient) || Number.isNaN(payload.volumeHoraire)) {
        throw new Error('Code, intitulé, coefficient et volume horaire sont requis.');
      }

      if (editingId) {
        await updateMatiere(editingId, payload);
        setSuccessMessage('Matière modifiée avec succès.');
      } else {
        await createMatiere(payload);
        setSuccessMessage('Matière ajoutée avec succès.');
      }

      closeFormModal();
      await loadSubjects();
    } catch (error) {
      console.error('Failed to save subject:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'Impossible d\'enregistrer la matière.');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (subject) => {
    setPendingDeleteSubject(subject);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setPendingDeleteSubject(null);
    setIsDeleteModalOpen(false);
  };

  const handleDelete = async () => {
    if (!pendingDeleteSubject) {
      return;
    }

    try {
      await deleteMatiere(pendingDeleteSubject.id);
      closeDeleteModal();
      setSuccessMessage('Matière supprimée avec succès.');
      await loadSubjects();
    } catch (error) {
      console.error('Failed to delete subject:', error);
      setErrorMessage(error.response?.data?.message || 'Impossible de supprimer la matière.');
      closeDeleteModal();
    }
  };

  const filteredSubjects = subjects.filter((subject) => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return true;
    }

    return [subject.code, subject.intitule, subject.coefficient, subject.volumeHoraire]
      .some((value) => String(value ?? '').toLowerCase().includes(term));
  });

  if (isProfessor) {
    return (
      <>
        <header className="page-header">
          <div className="page-title-row">
            <h1>Mes matières assignées</h1>
          </div>
          <p className="page-subtitle">Les matières, classes, coefficients et volumes horaires qui vous sont affectés.</p>
        </header>

        {assignedLoading ? (
          <div className="app-card rounded-card p-4 text-center">Chargement de vos matières...</div>
        ) : assignedSubjects.length ? (
          <section className="assigned-subject-grid">
            {assignedSubjects.map((subject) => (
              <article className="app-card rounded-card assigned-subject-card" key={subject.id}>
                <div className="assigned-subject-card-header">
                  <div className="assigned-subject-icon"><i className="bi bi-book-half" /></div>
                  <span className="badge-soft primary">{subject.code || 'Module'}</span>
                </div>
                <h3>{subject.intitule || 'Matière sans intitulé'}</h3>
                <div className="assigned-subject-details">
                  <div><span>Coefficient</span><strong>{subject.coefficient ?? '—'}</strong></div>
                  <div><span>Volume horaire</span><strong>{subject.weeklyHours || subject.volumeHoraire || 0} h / semaine</strong></div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div className="app-card rounded-card page-empty p-4 text-center text-muted">Aucune matière assignée pour le moment.</div>
        )}
      </>
    );
  }

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'intitule', label: 'Matière' },
    { key: 'coefficient', label: 'Coefficient' },
    { key: 'volumeHoraire', label: 'Volume horaire' },
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
            <h1>Matières</h1>
            <button className="btn btn-primary" type="button" onClick={openCreateModal}>
              Ajouter une matière
            </button>
          </div>
          <p className="page-subtitle">Gérez les matières, ajoutez, modifiez ou supprimez leurs informations.</p>
        </header>

        <div className="app-card rounded-card p-4 mb-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
            <div className="w-100 w-md-50">
              <label className="form-label">Recherche</label>
              <input
                className="form-control"
                type="text"
                placeholder="Rechercher par code, matière ou coefficient"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          {errorMessage && (
            <div className="alert alert-danger mt-0 mb-3" role="alert">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="alert alert-success mt-0 mb-3" role="alert">
              {successMessage}
            </div>
          )}
        </div>

        {loading ? (
          <div className="app-card rounded-card p-4 text-center">Chargement des matières...</div>
        ) : (
          <DataTable columns={columns} rows={filteredSubjects} emptyMessage="Aucune matière trouvée." />
        )}
      </div>

      {isFormModalOpen && (
        <div className="student-modal-backdrop" onClick={closeFormModal}>
          <div className="student-modal student-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-visual">
              <div className="student-modal-visual-badge">VPI • Gestion scolaire</div>
              <h4>{editingId ? 'Mettre à jour la matière' : 'Créer une nouvelle matière'}</h4>
              <p>
                {editingId
                  ? 'Modifiez les informations de la matière et enregistrez les changements.'
                  : 'Remplissez les informations de la matière pour l’ajouter au système.'}
              </p>
            </div>

            <div className="student-modal-body">
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Code</label>
                    <input
                      className="form-control"
                      name="code"
                      value={form.code}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Intitulé</label>
                    <input
                      className="form-control"
                      name="intitule"
                      value={form.intitule}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Coefficient</label>
                    <input
                      className="form-control"
                      type="number"
                      step="0.01"
                      name="coefficient"
                      value={form.coefficient}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Volume horaire</label>
                    <input
                      className="form-control"
                      type="number"
                      name="volumeHoraire"
                      value={form.volumeHoraire}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="alert alert-danger mt-3 mb-0" role="alert">
                    {errorMessage}
                  </div>
                )}

                <div className="student-modal-actions mt-4">
                  <button className="btn btn-outline-secondary" type="button" onClick={closeFormModal}>
                    Annuler
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? 'Enregistrement...' : editingId ? 'Enregistrer les modifications' : 'Ajouter la matière'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && pendingDeleteSubject && (
        <div className="student-modal-backdrop" onClick={closeDeleteModal}>
          <div className="student-modal confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-header">
              <h3>Confirmer la suppression</h3>
              <button className="btn-close" type="button" onClick={closeDeleteModal} aria-label="Fermer" />
            </div>

            <div className="student-modal-body">
              <p className="mb-3">
                Êtes-vous sûr de vouloir supprimer la matière <strong>{pendingDeleteSubject.intitule}</strong> ?
              </p>

              <div className="student-modal-actions">
                <button className="btn btn-outline-secondary" type="button" onClick={closeDeleteModal}>
                  Annuler
                </button>
                <button className="btn btn-danger" type="button" onClick={handleDelete}>
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SubjectsPage;
