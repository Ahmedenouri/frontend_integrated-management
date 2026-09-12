import { useEffect, useState } from 'react';
import { createClass, deleteClass, getAllClasses, updateClass } from '../api/erpApi';
import DataTable from '../components/DataTable';

const initialForm = {
  nom: '',
  niveau: '',
  anneeScolaire: '',
};

const ClassesPage = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeleteClass, setPendingDeleteClass] = useState(null);

  const loadClasses = async () => {
    try {
      const { data } = await getAllClasses();
      setClasses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load classes:', error);
      setErrorMessage('Impossible de charger les classes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
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

  const openEditModal = (classItem) => {
    setEditingId(classItem.id);
    setForm({
      nom: classItem.nom || '',
      niveau: classItem.niveau || '',
      anneeScolaire: classItem.anneeScolaire || '',
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
        nom: form.nom.trim(),
        niveau: form.niveau.trim(),
        anneeScolaire: form.anneeScolaire.trim(),
      };

      if (!payload.nom || !payload.niveau || !payload.anneeScolaire) {
        throw new Error('Nom, niveau et année scolaire sont requis.');
      }

      if (editingId) {
        await updateClass(editingId, payload);
        setSuccessMessage('Classe modifiée avec succès.');
      } else {
        await createClass(payload);
        setSuccessMessage('Classe ajoutée avec succès.');
      }

      closeFormModal();
      await loadClasses();
    } catch (error) {
      console.error('Failed to save class:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'Impossible d\'enregistrer la classe.');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (classItem) => {
    setPendingDeleteClass(classItem);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setPendingDeleteClass(null);
    setIsDeleteModalOpen(false);
  };

  const handleDelete = async () => {
    if (!pendingDeleteClass) {
      return;
    }

    try {
      await deleteClass(pendingDeleteClass.id);
      closeDeleteModal();
      setSuccessMessage('Classe supprimée avec succès.');
      await loadClasses();
    } catch (error) {
      console.error('Failed to delete class:', error);
      setErrorMessage(error.response?.data?.message || 'Impossible de supprimer la classe.');
      closeDeleteModal();
    }
  };

  const filteredClasses = classes.filter((classItem) => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return true;
    }

    return [classItem.nom, classItem.niveau, classItem.anneeScolaire]
      .some((value) => String(value ?? '').toLowerCase().includes(term));
  });

  const columns = [
    { key: 'nom', label: 'Classe' },
    { key: 'niveau', label: 'Niveau' },
    { key: 'anneeScolaire', label: 'Année scolaire' },
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
            <h1>Classes</h1>
            <button className="btn btn-primary" type="button" onClick={openCreateModal}>
              Ajouter une classe
            </button>
          </div>
          <p className="page-subtitle">Gérez les classes, ajoutez, modifiez ou supprimez leurs informations.</p>
        </header>

        <div className="app-card rounded-card p-4 mb-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
            <div className="w-100 w-md-50">
              <label className="form-label">Recherche</label>
              <input
                className="form-control"
                type="text"
                placeholder="Rechercher par classe, niveau ou année"
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
          <div className="app-card rounded-card p-4 text-center">Chargement des classes...</div>
        ) : (
          <DataTable columns={columns} rows={filteredClasses} emptyMessage="Aucune classe trouvée." />
        )}
      </div>

      {isFormModalOpen && (
        <div className="student-modal-backdrop" onClick={closeFormModal}>
          <div className="student-modal student-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-visual">
              <div className="student-modal-visual-badge">VPI • Gestion scolaire</div>
              <h4>{editingId ? 'Mettre à jour la classe' : 'Créer une nouvelle classe'}</h4>
              <p>
                {editingId
                  ? 'Modifiez les informations de la classe et enregistrez les changements.'
                  : 'Remplissez les informations de la classe pour l’ajouter au système.'}
              </p>
            </div>

            <div className="student-modal-body">
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-12">
                    <label className="form-label">Nom de la classe</label>
                    <input
                      className="form-control"
                      name="nom"
                      value={form.nom}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Niveau</label>
                    <input
                      className="form-control"
                      name="niveau"
                      value={form.niveau}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Année scolaire</label>
                    <input
                      className="form-control"
                      name="anneeScolaire"
                      value={form.anneeScolaire}
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
                    {saving ? 'Enregistrement...' : editingId ? 'Enregistrer les modifications' : 'Ajouter la classe'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && pendingDeleteClass && (
        <div className="student-modal-backdrop" onClick={closeDeleteModal}>
          <div className="student-modal confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-header">
              <h3>Confirmer la suppression</h3>
              <button className="btn-close" type="button" onClick={closeDeleteModal} aria-label="Fermer" />
            </div>

            <div className="student-modal-body">
              <p className="mb-3">
                Êtes-vous sûr de vouloir supprimer la classe <strong>{pendingDeleteClass.nom}</strong> ?
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

export default ClassesPage;
