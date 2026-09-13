import { useEffect, useState } from 'react';
import { createMatiere, deleteMatiere, getAllMatieres, updateMatiere } from '../api/erpApi';
import DataTable from '../components/DataTable';
import { useGlobalMessage } from '../utils/notifications';

const initialForm = {
  code: '',
  intitule: '',
  coefficient: '',
  volumeHoraire: '',
};

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState([]);
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
    loadSubjects();
  }, []);

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
