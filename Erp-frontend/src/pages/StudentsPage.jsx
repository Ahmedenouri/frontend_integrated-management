import { useEffect, useState } from 'react';
import { createStudent, deleteStudent, getAllClasses, getAllStudents, getStudentById, updateStudent } from '../api/erpApi';
import DataTable from '../components/DataTable';
import { useGlobalMessage } from '../utils/notifications';

const initialForm = {
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  motDePasse: '',
  cne: '',
  dateNaissance: '',
  nomParent: '',
  telephoneParent: '',
  emailParent: '',
  classeId: '',
  role: 'ETUDIANT',
  estActif: true,
};

const buildStudentFormValues = (student = {}) => ({
  nom: student.nom || '',
  prenom: student.prenom || '',
  email: student.email || '',
  telephone: student.telephone || '',
  motDePasse: '',
  cne: student.cne || '',
  dateNaissance: student.dateNaissance || '',
  nomParent: student.nomParent || '',
  telephoneParent: student.telephoneParent || '',
  emailParent: student.emailParent || '',
  classeId: student.classeId ?? '',
  role: student.role || 'ETUDIANT',
  estActif: Boolean(student.estActif),
});

const StudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState(initialForm);
  const [classes, setClasses] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useGlobalMessage('error');
  const [successMessage, setSuccessMessage] = useGlobalMessage('success');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [pendingDeleteStudent, setPendingDeleteStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadStudents = async () => {
    try {
      const [studentsResult, classesResult] = await Promise.allSettled([getAllStudents(), getAllClasses()]);
      if (studentsResult.status === 'fulfilled') {
        setStudents(Array.isArray(studentsResult.value.data) ? studentsResult.value.data : []);
      }
      if (classesResult.status === 'fulfilled') {
        setClasses(Array.isArray(classesResult.value.data) ? classesResult.value.data : []);
      }
    } catch (error) {
      console.error('Failed to load students:', error);
      setErrorMessage('Impossible de charger les étudiants.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadStudents();
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
    setIsFormModalOpen(true);
  };

  const openEditModal = async (student) => {
    setEditingId(student.id);
    setForm(buildStudentFormValues(student));
    setErrorMessage('');
    setSuccessMessage('');
    setIsFormModalOpen(true);

    try {
      const { data } = await getStudentById(student.id);
      setForm(buildStudentFormValues(data || student));
    } catch (error) {
      console.error('Failed to load student details for edit:', error);
      setErrorMessage('Impossible de charger toutes les informations de l’étudiant pour l’édition.');
    }
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

  const openDetailsModal = async (student) => {
    try {
      setDetailsLoading(true);
      setSelectedStudent(null);
      setIsDetailsModalOpen(true);

      const { data } = await getStudentById(student.id);
      setSelectedStudent(data || student);
    } catch (error) {
      console.error('Failed to load student details:', error);
      setSelectedStudent(student);
      setErrorMessage('Impossible de charger les détails complets de l’étudiant.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDeleteModal = () => {
    setPendingDeleteStudent(null);
    setIsDeleteModalOpen(false);
  };

  const closeDetailsModal = () => {
    setSelectedStudent(null);
    setIsDetailsModalOpen(false);
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
          <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => openDetailsModal(row)}>
            Voir
          </button>
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
      <div className={`page-shell ${isFormModalOpen || isDeleteModalOpen || isDetailsModalOpen ? 'page-blur' : ''}`}>
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
          <div className="student-modal student-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-visual">
              <div className="student-modal-visual-badge">VPI • Gestion scolaire</div>
              <h4>{editingId ? 'Mettre à jour le profil' : 'Créer un nouvel étudiant'}</h4>
              <p>
                {editingId
                  ? 'Modifiez les informations de l’ étudiant et enregistrez les changements en quelques clics.'
                  : 'Remplissez les informations principales pour ajouter un nouvel étudiant à l’établissement.'}
              </p>

              <div className="student-modal-stat-grid">
                <div className="student-modal-stat">
                  <span>Étudiants</span>
                  <strong>{students.length}</strong>
                </div>
                <div className="student-modal-stat">
                  <span>Actifs</span>
                  <strong>{students.filter((student) => student.estActif).length}</strong>
                </div>
              </div>
            </div>

            <div className="student-modal-panel">
              <div className="student-modal-header">
                <div>
                  <small className="student-modal-kicker">Fiche utilisateur</small>
                  <h3>{editingId ? 'Modifier un étudiant' : 'Ajouter un étudiant'}</h3>
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
                      <label className="form-label">CNE</label>
                      <input className="form-control" name="cne" value={form.cne} onChange={handleChange} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Date de naissance</label>
                      <input className="form-control" type="date" name="dateNaissance" value={form.dateNaissance} onChange={handleChange} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Nom du parent</label>
                      <input className="form-control" name="nomParent" value={form.nomParent} onChange={handleChange} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Téléphone du parent</label>
                      <input className="form-control" name="telephoneParent" value={form.telephoneParent} onChange={handleChange} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email du parent</label>
                      <input className="form-control" type="email" name="emailParent" value={form.emailParent} onChange={handleChange} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Classe</label>
                      <select className="form-select" name="classeId" value={form.classeId} onChange={handleChange}>
                        <option value="">Choisir une classe</option>
                        {classes.map((classItem) => (
                          <option key={classItem.id} value={classItem.id}>
                            {classItem.nom || `Classe ${classItem.id}`}
                            {classItem.niveau ? ` - ${classItem.niveau}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Rôle</label>
                      <select className="form-select" name="role" value={form.role} onChange={handleChange}>
                        <option value="ETUDIANT">Étudiant</option>
                        <option value="DIRECTEUR">Directeur</option>
                        <option value="PROFESSEUR">Professeur</option>
                        <option value="SURVEILLANT">Surveillant</option>
                        <option value="RESPONSABLE_FINANCIER">Responsable financier</option>
                      </select>
                    </div>
                    <div className="col-md-6">
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
                    <div className="col-md-6 student-toggle-wrap">
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

      {isDetailsModalOpen && selectedStudent && (
        <div className="student-modal-backdrop" onClick={closeDetailsModal}>
          <div className="student-modal student-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-visual">
              <div className="student-modal-visual-badge">VPI • Détails étudiant</div>
              <h4>{selectedStudent.nom} {selectedStudent.prenom}</h4>
              <p>Informations complètes de l’étudiant et de ses parents.</p>
            </div>

            <div className="student-modal-body">
              {detailsLoading ? (
                <div className="text-center p-4">Chargement des détails...</div>
              ) : (
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Nom</label>
                    <div className="form-control bg-light border-0">{selectedStudent.nom || '—'}</div>
                  </div>

                <div className="col-md-6">
                  <label className="form-label">Prénom</label>
                  <div className="form-control bg-light border-0">{selectedStudent.prenom || '—'}</div>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <div className="form-control bg-light border-0">{selectedStudent.email || '—'}</div>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Téléphone</label>
                  <div className="form-control bg-light border-0">{selectedStudent.telephone || '—'}</div>
                </div>

                <div className="col-md-6">
                  <label className="form-label">CNE</label>
                  <div className="form-control bg-light border-0">{selectedStudent.cne || '—'}</div>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Date de naissance</label>
                  <div className="form-control bg-light border-0">{selectedStudent.dateNaissance || '—'}</div>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Nom du parent</label>
                  <div className="form-control bg-light border-0">{selectedStudent.nomParent || '—'}</div>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Téléphone du parent</label>
                  <div className="form-control bg-light border-0">{selectedStudent.telephoneParent || '—'}</div>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Email du parent</label>
                  <div className="form-control bg-light border-0">{selectedStudent.emailParent || '—'}</div>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Classe</label>
                  <div className="form-control bg-light border-0">
                    {classes.find((classItem) => String(classItem.id) === String(selectedStudent.classeId))?.nom
                      || selectedStudent.classeId
                      || '—'}
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Statut</label>
                  <div className="form-control bg-light border-0">{selectedStudent.estActif ? 'Actif' : 'Inactif'}</div>
                </div>

                  <div className="col-md-6">
                    <label className="form-label">Rôle</label>
                    <div className="form-control bg-light border-0">{selectedStudent.role || 'ETUDIANT'}</div>
                  </div>
                </div>
              )}

              <div className="student-modal-actions mt-4">
                <button className="btn btn-outline-secondary" type="button" onClick={closeDetailsModal}>
                  Fermer
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
