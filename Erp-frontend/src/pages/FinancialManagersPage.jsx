import { useEffect, useState } from 'react';
import {
  createFinancialManager,
  deleteFinancialManager,
  getAllFinancialManagers,
  updateFinancialManager,
} from '../api/erpApi';
import DataTable from '../components/DataTable';
import { useGlobalMessage } from '../utils/notifications';

const initialForm = {
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  motDePasse: '',
  estActif: true,
};

const FinancialManagersPage = () => {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [pendingDeleteManager, setPendingDeleteManager] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useGlobalMessage('error');
  const [successMessage, setSuccessMessage] = useGlobalMessage('success');

  const loadManagers = async () => {
    try {
      const { data } = await getAllFinancialManagers();
      setManagers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load financial managers:', error);
      setErrorMessage('Impossible de charger les responsables financiers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadManagers();
    }, 0);

    return () => window.clearTimeout(timer);
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

  const openEditModal = (manager) => {
    setEditingId(manager.id);
    setForm({
      nom: manager.nom || '',
      prenom: manager.prenom || '',
      email: manager.email || '',
      telephone: manager.telephone || '',
      motDePasse: '',
      estActif: Boolean(manager.estActif),
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
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
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
        prenom: form.prenom.trim(),
        email: form.email.trim(),
        telephone: form.telephone.trim(),
        role: 'RESPONSABLE_FINANCIER',
        estActif: Boolean(form.estActif),
      };

      if (!payload.nom || !payload.prenom || !payload.email) {
        throw new Error('Nom, prénom et email sont obligatoires.');
      }

      if (!editingId && !form.motDePasse) {
        throw new Error('Le mot de passe est obligatoire pour un nouveau responsable financier.');
      }

      if (form.motDePasse) {
        payload.motDePasse = form.motDePasse;
      }

      if (editingId) {
        await updateFinancialManager(editingId, payload);
        setSuccessMessage('Responsable financier modifié avec succès.');
      } else {
        await createFinancialManager(payload);
        setSuccessMessage('Responsable financier ajouté avec succès.');
      }

      closeFormModal();
      await loadManagers();
    } catch (error) {
      console.error('Failed to save financial manager:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'Impossible d’enregistrer le responsable financier.');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (manager) => {
    setPendingDeleteManager(manager);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setPendingDeleteManager(null);
    setIsDeleteModalOpen(false);
  };

  const handleDelete = async () => {
    if (!pendingDeleteManager) return;

    try {
      await deleteFinancialManager(pendingDeleteManager.id);
      closeDeleteModal();
      setSuccessMessage('Responsable financier supprimé avec succès.');
      await loadManagers();
    } catch (error) {
      console.error('Failed to delete financial manager:', error);
      setErrorMessage(error.response?.data?.message || 'Impossible de supprimer le responsable financier.');
      closeDeleteModal();
    }
  };

  const columns = [
    { key: 'nom', label: 'Nom' },
    { key: 'prenom', label: 'Prénom' },
    { key: 'email', label: 'Email' },
    { key: 'telephone', label: 'Téléphone' },
    {
      key: 'estActif',
      label: 'Statut',
      render: (row) => (
        <span className={`badge-soft ${row.estActif ? 'success' : 'warning'}`}>
          {row.estActif ? 'Actif' : 'Inactif'}
        </span>
      ),
    },
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
            <h1>Responsables financiers</h1>
            <button className="btn btn-primary" type="button" onClick={openCreateModal}>
              Ajouter un responsable financier
            </button>
          </div>
          <p className="page-subtitle">Gérez les utilisateurs responsables de la gestion financière.</p>
        </header>

        {errorMessage && !isFormModalOpen && !isDeleteModalOpen && <div className="alert alert-danger">{errorMessage}</div>}
        {successMessage && <div className="alert alert-success">{successMessage}</div>}

        {loading ? (
          <div className="app-card rounded-card p-4 text-center">Chargement des responsables financiers...</div>
        ) : (
          <DataTable columns={columns} rows={managers} emptyMessage="Aucun responsable financier trouvé." />
        )}
      </div>

      {isFormModalOpen && (
        <div className="student-modal-backdrop" onClick={closeFormModal}>
          <div className="student-modal student-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-visual">
              <div className="student-modal-visual-badge">VPI • Finance</div>
              <h4>{editingId ? 'Modifier un responsable financier' : 'Ajouter un responsable financier'}</h4>
              <p>Renseignez les informations et les accès du responsable financier.</p>
            </div>

            <div className="student-modal-panel">
              <div className="student-modal-header">
                <div>
                  <small className="student-modal-kicker">Fiche finance</small>
                  <h3>{editingId ? 'Modifier les informations' : 'Créer un nouveau responsable'}</h3>
                </div>
                <button className="btn-close" type="button" onClick={closeFormModal} aria-label="Fermer" />
              </div>

              <div className="student-modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="row g-3 student-form-grid">
                    <div className="col-md-6">
                      <label className="form-label">Nom</label>
                      <input className="form-control" name="nom" value={form.nom} onChange={handleChange} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Prénom</label>
                      <input className="form-control" name="prenom" value={form.prenom} onChange={handleChange} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <input className="form-control" type="email" name="email" value={form.email} onChange={handleChange} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Téléphone</label>
                      <input className="form-control" name="telephone" value={form.telephone} onChange={handleChange} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Mot de passe</label>
                      <input className="form-control" type="password" name="motDePasse" value={form.motDePasse} onChange={handleChange} placeholder={editingId ? 'Laisser vide pour conserver' : 'Obligatoire'} />
                    </div>
                    <div className="col-12 student-toggle-wrap">
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" name="estActif" id="financialManagerActive" checked={form.estActif} onChange={handleChange} />
                        <label className="form-check-label" htmlFor="financialManagerActive">Responsable actif</label>
                      </div>
                    </div>
                  </div>

                  {errorMessage && <div className="alert alert-danger mt-3 mb-0">{errorMessage}</div>}

                  <div className="student-modal-actions">
                    <button className="btn btn-outline-secondary" type="button" onClick={closeFormModal}>Annuler</button>
                    <button className="btn btn-primary" type="submit" disabled={saving}>
                      {saving ? 'Enregistrement...' : editingId ? 'Enregistrer les modifications' : 'Ajouter le responsable'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && pendingDeleteManager && (
        <div className="student-modal-backdrop" onClick={closeDeleteModal}>
          <div className="student-modal confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-header">
              <h3>Confirmer la suppression</h3>
              <button className="btn-close" type="button" onClick={closeDeleteModal} aria-label="Fermer" />
            </div>
            <div className="student-modal-body">
              <p className="mb-3">
                Êtes-vous sûr de vouloir supprimer <strong>{pendingDeleteManager.prenom} {pendingDeleteManager.nom}</strong> ?
              </p>
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

export default FinancialManagersPage;
