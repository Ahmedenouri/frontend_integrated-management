import { useEffect, useState } from 'react';
import {
  createEvaluation,
  deleteEvaluation,
  getAllEvaluations,
  getAllMatieres,
  updateEvaluation,
} from '../api/erpApi';
import DataTable from '../components/DataTable';

const initialForm = {
  titre: '',
  typeEval: 'EXAMEN_FINAL',
  dateEvaluation: '',
  coefficient: '',
  matiereId: '',
};

const EvaluationsPage = () => {
  const [evaluations, setEvaluations] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeleteEvaluation, setPendingDeleteEvaluation] = useState(null);

  const loadData = async () => {
    try {
      const [evaluationsResponse, matieresResponse] = await Promise.all([
        getAllEvaluations(),
        getAllMatieres(),
      ]);

      setEvaluations(Array.isArray(evaluationsResponse?.data) ? evaluationsResponse.data : []);
      setSubjects(Array.isArray(matieresResponse?.data) ? matieresResponse.data : []);
    } catch (error) {
      console.error('Failed to load evaluations data:', error);
      setErrorMessage('Impossible de charger les évaluations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  const openEditModal = (evaluation) => {
    setEditingId(evaluation.id);
    setForm({
      titre: evaluation.titre || '',
      typeEval: evaluation.typeEval || 'EXAMEN_FINAL',
      dateEvaluation: evaluation.dateEvaluation || '',
      coefficient: evaluation.coefficient ?? '',
      matiereId: evaluation.matiereId ?? '',
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
        titre: form.titre.trim(),
        typeEval: form.typeEval,
        dateEvaluation: form.dateEvaluation,
        coefficient: Number(form.coefficient),
        matiereId: Number(form.matiereId),
      };

      if (!payload.titre || !payload.dateEvaluation || !payload.matiereId || Number.isNaN(payload.coefficient)) {
        throw new Error('Titre, date, matière et coefficient sont requis.');
      }

      if (editingId) {
        await updateEvaluation(editingId, payload);
        setSuccessMessage('Évaluation modifiée avec succès.');
      } else {
        await createEvaluation(payload);
        setSuccessMessage('Évaluation ajoutée avec succès.');
      }

      closeFormModal();
      await loadData();
    } catch (error) {
      console.error('Failed to save evaluation:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'Impossible d\'enregistrer l\'évaluation.');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (evaluation) => {
    setPendingDeleteEvaluation(evaluation);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setPendingDeleteEvaluation(null);
    setIsDeleteModalOpen(false);
  };

  const handleDelete = async () => {
    if (!pendingDeleteEvaluation) {
      return;
    }

    try {
      await deleteEvaluation(pendingDeleteEvaluation.id);
      closeDeleteModal();
      setSuccessMessage('Évaluation supprimée avec succès.');
      await loadData();
    } catch (error) {
      console.error('Failed to delete evaluation:', error);
      setErrorMessage(error.response?.data?.message || 'Impossible de supprimer l\'évaluation.');
      closeDeleteModal();
    }
  };

  const subjectMap = new Map(
    subjects.map((subject) => [subject.id, subject.intitule || subject.code || `Matière ${subject.id}`])
  );

  const filteredEvaluations = evaluations.filter((evaluation) => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return true;
    }

    return [
      evaluation.titre,
      evaluation.typeEval,
      evaluation.dateEvaluation,
      evaluation.coefficient,
      subjectMap.get(evaluation.matiereId),
    ].some((value) => String(value ?? '').toLowerCase().includes(term));
  });

  const columns = [
    { key: 'titre', label: 'Titre' },
    { key: 'typeEval', label: 'Type' },
    { key: 'dateEvaluation', label: 'Date' },
    { key: 'coefficient', label: 'Coefficient' },
    {
      key: 'matiereId',
      label: 'Matière',
      render: (row) => subjectMap.get(row.matiereId) || row.matiereId || '—',
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
            <h1>Évaluations</h1>
            <button className="btn btn-primary" type="button" onClick={openCreateModal}>
              Ajouter une évaluation
            </button>
          </div>
          <p className="page-subtitle">Gérez les évaluations, ajoutez, modifiez ou supprimez les enregistrements.</p>
        </header>

        <div className="app-card rounded-card p-4 mb-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
            <div className="w-100 w-md-50">
              <label className="form-label">Recherche</label>
              <input
                className="form-control"
                type="text"
                placeholder="Rechercher par titre, type, date ou matière"
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
          <div className="app-card rounded-card p-4 text-center">Chargement des évaluations...</div>
        ) : (
          <DataTable columns={columns} rows={filteredEvaluations} emptyMessage="Aucune évaluation trouvée." />
        )}
      </div>

      {isFormModalOpen && (
        <div className="student-modal-backdrop" onClick={closeFormModal}>
          <div className="student-modal student-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-visual">
              <div className="student-modal-visual-badge">VPI • Gestion académique</div>
              <h4>{editingId ? 'Mettre à jour l\'évaluation' : 'Créer une nouvelle évaluation'}</h4>
              <p>
                {editingId
                  ? 'Modifiez les informations de l\'évaluation et enregistrez les changements.'
                  : 'Remplissez les informations de l\'évaluation pour l\'ajouter au système.'}
              </p>
            </div>

            <div className="student-modal-body">
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Titre</label>
                    <input
                      className="form-control"
                      name="titre"
                      value={form.titre}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Type</label>
                    <select className="form-select" name="typeEval" value={form.typeEval} onChange={handleChange} required>
                      <option value="EXAMEN_FINAL">EXAMEN_FINAL</option>
                      <option value="CONTROLE_CONTINU">CONTROLE_CONTINU</option>
                      <option value="TP">TP</option>
                      <option value="PROJET">PROJET</option>
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Date</label>
                    <input
                      className="form-control"
                      type="date"
                      name="dateEvaluation"
                      value={form.dateEvaluation}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-4">
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

                  <div className="col-md-4">
                    <label className="form-label">Matière</label>
                    <select
                      className="form-select"
                      name="matiereId"
                      value={form.matiereId}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Sélectionner une matière</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.intitule || subject.code || `Matière ${subject.id}`}
                        </option>
                      ))}
                    </select>
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
                    {saving ? 'Enregistrement...' : editingId ? 'Enregistrer les modifications' : 'Ajouter l\'évaluation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && pendingDeleteEvaluation && (
        <div className="student-modal-backdrop" onClick={closeDeleteModal}>
          <div className="student-modal confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-header">
              <h3>Confirmer la suppression</h3>
              <button className="btn-close" type="button" onClick={closeDeleteModal} aria-label="Fermer" />
            </div>

            <div className="student-modal-body">
              <p className="mb-3">
                Êtes-vous sûr de vouloir supprimer l’évaluation <strong>{pendingDeleteEvaluation.titre}</strong> ?
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

export default EvaluationsPage;
