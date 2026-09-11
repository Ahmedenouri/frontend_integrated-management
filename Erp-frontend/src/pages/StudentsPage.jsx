import { useEffect, useState } from 'react';
import { createStudent, deleteStudent, getAllStudents, updateStudent } from '../api/erpApi';
import DataTable from '../components/DataTable';

const initialForm = {
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  motDePasse: '',
  cne: '',
  role: 'ETUDIANT',
  estActif: true,
};

const StudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeleteStudent, setPendingDeleteStudent] = useState(null);

  const loadStudents = async () => {
    try {
      const { data } = await getAllStudents();
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load students:', error);
      setErrorMessage('Impossible de charger les étudiants.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setErrorMessage('');
  };

  const openCreateModal = () => {
    resetForm();
    setIsFormModalOpen(true);
  };

  const openEditModal = (student) => {
    setEditingId(student.id);
    setForm({
      nom: student.nom || '',
      prenom: student.prenom || '',
      email: student.email || '',
      telephone: student.telephone || '',
      motDePasse: '',
      cne: student.cne || '',
      role: student.role || 'ETUDIANT',
      estActif: Boolean(student.estActif),
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
        ...form,
        role: form.role || 'ETUDIANT',
        estActif: Boolean(form.estActif),
      };

      if (!editingId) {
        if (!payload.email || !payload.motDePasse || !payload.nom || !payload.prenom) {
          throw new Error('Nom, prénom, email et mot de passe sont requis.');
        }

        await createStudent(payload);
        setSuccessMessage('Étudiant ajouté avec succès.');
      } else {
        const updatePayload = { ...payload };
        if (!updatePayload.motDePasse) {
          delete updatePayload.motDePasse;
        }

        await updateStudent(editingId, updatePayload);
        setSuccessMessage('Étudiant modifié avec succès.');
      }

      closeFormModal();
      await loadStudents();
    } catch (error) {
      console.error('Failed to save student:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'Impossible d\'enregistrer l\'étudiant.');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (student) => {
    setPendingDeleteStudent(student);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setPendingDeleteStudent(null);
    setIsDeleteModalOpen(false);
  };

  const handleDelete = async () => {
    if (!pendingDeleteStudent) {
      return;
    }

    try {
      await deleteStudent(pendingDeleteStudent.id);
      closeDeleteModal();
      setSuccessMessage('Étudiant supprimé avec succès.');
      await loadStudents();
    } catch (error) {
      console.error('Failed to delete student:', error);
      setErrorMessage(error.response?.data?.message || 'Impossible de supprimer l\'étudiant.');
      closeDeleteModal();
    }
  };

  const filteredStudents = students.filter((student) => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return true;
    }

    return `${student.nom || ''} ${student.prenom || ''}`.toLowerCase().includes(term);
  });

  const columns = [
    { key: 'nom', label: 'Nom' },
    { key: 'prenom', label: 'Prénom' },
    { key: 'email', label: 'Email' },
    { key: 'telephone', label: 'Téléphone' },
    { key: 'cne', label: 'CNE' },
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
            <h1>Étudiants</h1>
            <button className="btn btn-primary" type="button" onClick={openCreateModal}>
              Ajouter un étudiant
            </button>
          </div>
          <p className="page-subtitle">Gérez les étudiants, ajoutez, modifiez ou supprimez leurs dossiers.</p>
        </header>

        <div className="app-card rounded-card p-4 mb-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
            <div className="w-100 w-md-50">
              <label className="form-label">Recherche par nom</label>
              <input
                className="form-control"
                type="text"
                placeholder="Rechercher par nom ou prénom"
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
          <div className="app-card rounded-card p-4 text-center">Chargement des étudiants...</div>
        ) : (
          <DataTable columns={columns} rows={filteredStudents} emptyMessage="Aucun étudiant trouvé." />
        )}
      </div>

      {isFormModalOpen && (
        <div className="student-modal-backdrop" onClick={closeFormModal}>
          <div className="student-modal" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-header">
              <h3>{editingId ? 'Modifier un étudiant' : 'Ajouter un étudiant'}</h3>
              <button className="btn-close" type="button" onClick={closeFormModal} aria-label="Fermer" />
            </div>

            <div className="student-modal-body">
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Nom</label>
                    <input className="form-control" name="nom" value={form.nom} onChange={handleChange} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Prénom</label>
                    <input className="form-control" name="prenom" value={form.prenom} onChange={handleChange} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Email</label>
                    <input className="form-control" type="email" name="email" value={form.email} onChange={handleChange} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Téléphone</label>
                    <input className="form-control" name="telephone" value={form.telephone} onChange={handleChange} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">CNE</label>
                    <input className="form-control" name="cne" value={form.cne} onChange={handleChange} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Rôle</label>
                    <select className="form-select" name="role" value={form.role} onChange={handleChange}>
                      <option value="ETUDIANT">Étudiant</option>
                      <option value="DIRECTEUR">Directeur</option>
                      <option value="PROFESSEUR">Professeur</option>
                      <option value="SURVEILLANT">Surveillant</option>
                      <option value="RESPONSABLE_FINANCIER">Responsable financier</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Mot de passe</label>
                    <input
                      className="form-control"
                      type="password"
                      name="motDePasse"
                      value={form.motDePasse}
                      onChange={handleChange}
                      placeholder={editingId ? 'Laisser vide pour conserver le mot de passe actuel' : 'Obligatoire'}
                    />
                  </div>
                  <div className="col-md-6 d-flex align-items-center">
                    <div className="form-check mt-4">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="estActifModal"
                        name="estActif"
                        checked={form.estActif}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="estActifModal">
                        Étudiant actif
                      </label>
                    </div>
                  </div>
                </div>

                {errorMessage && (
                  <div className="alert alert-danger mt-3 mb-0" role="alert">
                    {errorMessage}
                  </div>
                )}

                <div className="student-modal-actions">
                  <button className="btn btn-outline-secondary" type="button" onClick={closeFormModal}>
                    Fermer
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? 'Enregistrement...' : editingId ? 'Enregistrer les modifications' : 'Ajouter l\'étudiant'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && pendingDeleteStudent && (
        <div className="student-modal-backdrop" onClick={closeDeleteModal}>
          <div className="student-modal confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-header">
              <h3>Confirmer la suppression</h3>
              <button className="btn-close" type="button" onClick={closeDeleteModal} aria-label="Fermer" />
            </div>

            <div className="student-modal-body">
              <p className="mb-3">
                Êtes-vous sûr de vouloir supprimer <strong>{pendingDeleteStudent.nom} {pendingDeleteStudent.prenom}</strong> ?
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

export default StudentsPage;
