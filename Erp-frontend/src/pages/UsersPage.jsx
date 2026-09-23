import { useEffect, useState } from 'react';
import {
  createUser,
  deleteUser,
  getAllUsers,
  getStudentById,
  getUserById,
  updateUser,
} from '../api/erpApi';
import DataTable from '../components/DataTable';
import { useGlobalMessage } from '../utils/notifications';

const initialForm = {
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  motDePasse: '',
  role: 'ETUDIANT',
  estActif: true,
  cne: '',
  dateNaissance: '',
  nomParent: '',
  telephoneParent: '',
  emailParent: '',
  classeId: '',
  specialite: '',
};

const normalizeUsersResponse = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.content)) {
    return payload.content;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
};

const normalizeRoleValue = (role) => {
  const value = String(role || '').trim().toUpperCase();

  return value.startsWith('ROLE_') ? value.replace(/^ROLE_/, '') : value;
};

const roleLabels = {
  DIRECTEUR: 'Directeur',
  RESPONSABLE_FINANCIER: 'Responsable financier',
  SURVEILLANT: 'Surveillant',
  PROFESSEUR: 'Professeur',
  ETUDIANT: 'Étudiant',
};

const formatRole = (role) => roleLabels[normalizeRoleValue(role)] || normalizeRoleValue(role) || '—';
const getSpecialityValue = (user) => {
  if (!user || typeof user !== 'object') {
    return '—';
  }

  const candidates = [
    user.specialite,
    user.professeur?.specialite,
    user.teacher?.specialite,
    user.profile?.specialite,
    user.profil?.specialite,
    user.user?.specialite,
    user.data?.specialite,
    user.content?.specialite,
  ];

  const found = candidates.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
  return found !== undefined ? String(found) : '—';
};

const formatDate = (value) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [errorMessage, setErrorMessage] = useGlobalMessage('error');
  const [successMessage, setSuccessMessage] = useGlobalMessage('success');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const loadUsers = async () => {
    try {
      const { data } = await getAllUsers();
      setUsers(normalizeUsersResponse(data));
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to load users:', error);
      setErrorMessage('Impossible de charger les utilisateurs.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadUsers();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const openEditModal = (user) => {
    setEditingId(user.id);
    setForm({
      nom: user.nom || '',
      prenom: user.prenom || '',
      email: user.email || '',
      telephone: user.telephone || '',
      motDePasse: '',
      role: normalizeRoleValue(user.role) || 'ETUDIANT',
      estActif: Boolean(user.estActif),
      cne: user.cne || '',
      dateNaissance: user.dateNaissance || '',
      nomParent: user.nomParent || '',
      telephoneParent: user.telephoneParent || '',
      emailParent: user.emailParent || '',
      classeId: user.classeId ?? '',
      specialite: getSpecialityValue(user) === '—' ? '' : getSpecialityValue(user),
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

  const buildPayload = () => {
    const normalizedRole = normalizeRoleValue(form.role) || 'ETUDIANT';

    const payload = {
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      email: form.email.trim(),
      telephone: form.telephone.trim(),
      role: normalizedRole,
      estActif: Boolean(form.estActif),
    };

    if (form.motDePasse && form.motDePasse.trim()) {
      payload.motDePasse = form.motDePasse.trim();
    }

    if (normalizedRole === 'ETUDIANT') {
      payload.cne = (form.cne || '').trim();
      payload.dateNaissance = form.dateNaissance || '';
      payload.nomParent = (form.nomParent || '').trim();
      payload.telephoneParent = (form.telephoneParent || '').trim();
      payload.emailParent = (form.emailParent || '').trim();
      payload.classeId = form.classeId === '' ? undefined : Number(form.classeId);
    }

    if (normalizedRole === 'PROFESSEUR') {
      payload.specialite = (form.specialite || '').trim();
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = buildPayload();

      if (!payload.nom || !payload.prenom || !payload.email || !payload.role) {
        throw new Error('Nom, prénom, email et rôle sont requis.');
      }

      if (!editingId && !payload.motDePasse) {
        throw new Error('Le mot de passe est requis pour créer un utilisateur.');
      }

      if (editingId) {
        const updatePayload = { ...payload };

        if (!updatePayload.motDePasse) {
          delete updatePayload.motDePasse;
        }

        await updateUser(payload.role, editingId, updatePayload);
        setSuccessMessage('Utilisateur modifié avec succès.');
      } else {
        await createUser(payload.role, payload);
        setSuccessMessage('Utilisateur ajouté avec succès.');
      }

      closeFormModal();
      await loadUsers();
    } catch (error) {
      console.error('Failed to save user:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'Impossible d\'enregistrer l\'utilisateur.');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (user) => {
    setPendingDeleteUser(user);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setPendingDeleteUser(null);
    setIsDeleteModalOpen(false);
  };

  const handleDelete = async () => {
    if (!pendingDeleteUser) {
      return;
    }

    try {
      await deleteUser(pendingDeleteUser.role, pendingDeleteUser.id);
      closeDeleteModal();
      setSuccessMessage('Utilisateur supprimé avec succès.');
      await loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      setErrorMessage(error.response?.data?.message || 'Impossible de supprimer l\'utilisateur.');
      closeDeleteModal();
    }
  };

  const openUserDetails = async (user) => {
    try {
      setDetailsLoading(true);
      setSelectedUser(null);
      setIsDetailsModalOpen(true);

      const userRole = normalizeRoleValue(user.role);
      const { data } = userRole === 'ETUDIANT'
        ? await getStudentById(user.id)
        : await getUserById(user.id);

      const mergedUser = {
        ...user,
        ...(data && typeof data === 'object' ? data : {}),
        ...(data?.data && typeof data.data === 'object' ? data.data : {}),
      };

      setSelectedUser(mergedUser);
    } catch (error) {
      console.error('Failed to load user details:', error);
      setSelectedUser(user);
      setErrorMessage('Impossible de charger les détails de cet utilisateur.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetailsModal = () => {
    setSelectedUser(null);
    setIsDetailsModalOpen(false);
  };

  const normalizedSelectedRole = normalizeRoleValue(selectedUser?.role);

  const filteredUsers = users.filter((user) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesRole = !roleFilter || normalizeRoleValue(user.role) === roleFilter;

    if (!matchesRole) {
      return false;
    }

    if (!term) {
      return true;
    }

    return [
      user.nom,
      user.prenom,
      user.email,
      user.telephone,
      user.role,
      formatRole(user.role),
    ].some((value) => String(value ?? '').toLowerCase().includes(term));
  });

  const columns = [
    {
      key: 'nom',
      label: 'Nom complet',
      render: (row) => `${row.nom || ''} ${row.prenom || ''}`.trim() || '—',
    },
    { key: 'email', label: 'Email' },
    { key: 'telephone', label: 'Téléphone' },
    {
      key: 'role',
      label: 'Rôle',
      render: (row) => (
        <span className="badge bg-primary-subtle text-primary-emphasis rounded-pill">
          {formatRole(row.role)}
        </span>
      ),
    },
    {
      key: 'estActif',
      label: 'Statut',
      render: (row) => (
        <span className={`badge rounded-pill ${row.estActif ? 'bg-success-subtle text-success-emphasis' : 'bg-secondary-subtle text-secondary-emphasis'}`}>
          {row.estActif ? 'Actif' : 'Inactif'}
        </span>
      ),
    },
    {
      key: 'dateCreation',
      label: 'Date création',
      render: (row) => formatDate(row.dateCreation),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => openUserDetails(row)}>
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
            <h1>Utilisateurs</h1>
            <button className="btn btn-primary" type="button" onClick={openCreateModal}>
              Ajouter un utilisateur
            </button>
          </div>
          <p className="page-subtitle">Gérez les utilisateurs du système, ajoutez, modifiez ou supprimez leurs comptes.</p>
        </header>

        <div className="app-card rounded-card p-4 mb-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
            <div className="w-100 w-md-50">
              <label className="form-label">Recherche</label>
              <input
                className="form-control"
                type="text"
                placeholder="Rechercher par nom, email, téléphone ou rôle"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="w-100 w-md-25">
              <label className="form-label">Filtrer par rôle</label>
              <select className="form-select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="">Tous les rôles</option>
                <option value="ETUDIANT">Étudiant</option>
                <option value="SURVEILLANT">Surveillant</option>
                <option value="RESPONSABLE_FINANCIER">Responsable financier</option>
                <option value="PROFESSEUR">Professeur</option>
              </select>
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
          <div className="app-card rounded-card p-4 text-center">Chargement des utilisateurs...</div>
        ) : (
          <DataTable columns={columns} rows={filteredUsers} emptyMessage="Aucun utilisateur trouvé." />
        )}
      </div>

      {isFormModalOpen && (
        <div className="student-modal-backdrop" onClick={closeFormModal}>
          <div className="student-modal student-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-visual">
              <div className="student-modal-visual-badge">VPI • Gestion des comptes</div>
              <h4>{editingId ? 'Mettre à jour l’utilisateur' : 'Créer un nouvel utilisateur'}</h4>
              <p>
                {editingId
                  ? 'Modifiez les informations du compte et enregistrez les changements.'
                  : 'Remplissez les informations du compte pour l’ajouter au système.'}
              </p>
            </div>

            <div className="student-modal-body">
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
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
                    <label className="form-label">Rôle</label>
                    <select className="form-select" name="role" value={form.role} onChange={handleChange}>
                      <option value="ETUDIANT">Étudiant</option>
                      <option value="PROFESSEUR">Professeur</option>
                      <option value="SURVEILLANT">Surveillant</option>
                      <option value="RESPONSABLE_FINANCIER">Responsable financier</option>
                      <option value="DIRECTEUR">Directeur</option>
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
                      placeholder={editingId ? 'Laisser vide pour conserver l’actuel' : 'Obligatoire'}
                    />
                  </div>

                  {form.role === 'ETUDIANT' && (
                    <>
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
                        <label className="form-label">Classe ID</label>
                        <input className="form-control" type="number" name="classeId" value={form.classeId} onChange={handleChange} />
                      </div>
                    </>
                  )}

                  {form.role === 'PROFESSEUR' && (
                    <div className="col-md-12">
                      <label className="form-label">Spécialité</label>
                      <input className="form-control" name="specialite" value={form.specialite} onChange={handleChange} />
                    </div>
                  )}

                  <div className="col-12">
                    <div className="form-check mt-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="estActifUser"
                        name="estActif"
                        checked={form.estActif}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="estActifUser">
                        Utilisateur actif
                      </label>
                    </div>
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
                    {saving ? 'Enregistrement...' : editingId ? 'Enregistrer les modifications' : 'Ajouter l’utilisateur'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && pendingDeleteUser && (
        <div className="student-modal-backdrop" onClick={closeDeleteModal}>
          <div className="student-modal confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-header">
              <h3>Confirmer la suppression</h3>
              <button className="btn-close" type="button" onClick={closeDeleteModal} aria-label="Fermer" />
            </div>

            <div className="student-modal-body">
              <p className="mb-3">
                Êtes-vous sûr de vouloir supprimer l’utilisateur <strong>{pendingDeleteUser.nom} {pendingDeleteUser.prenom}</strong> ?
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

      {isDetailsModalOpen && (
        <div className="student-modal-backdrop" onClick={closeDetailsModal}>
          <div className="student-modal student-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-visual">
              <div className="student-modal-visual-badge">VPI • Gestion des comptes</div>
              <h4>{selectedUser ? 'Détails de l’utilisateur' : 'Chargement...'}</h4>
              <p>Consultez les informations complètes associées à ce compte utilisateur.</p>
            </div>

            <div className="student-modal-body">
              {detailsLoading ? (
                <div className="text-center p-4">Chargement des détails...</div>
              ) : selectedUser ? (
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Nom</label>
                    <div className="form-control bg-light border-0">{selectedUser.nom || '—'}</div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Prénom</label>
                    <div className="form-control bg-light border-0">{selectedUser.prenom || '—'}</div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <div className="form-control bg-light border-0">{selectedUser.email || '—'}</div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Téléphone</label>
                    <div className="form-control bg-light border-0">{selectedUser.telephone || '—'}</div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Rôle</label>
                    <div className="form-control bg-light border-0">{formatRole(selectedUser.role)}</div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Statut</label>
                    <div className="form-control bg-light border-0">{selectedUser.estActif ? 'Actif' : 'Inactif'}</div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Date de création</label>
                    <div className="form-control bg-light border-0">{formatDate(selectedUser.dateCreation)}</div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">ID</label>
                    <div className="form-control bg-light border-0">{selectedUser.id ?? '—'}</div>
                  </div>

                  {normalizedSelectedRole === 'ETUDIANT' && (
                    <>
                      <div className="col-md-6">
                        <label className="form-label">CNE</label>
                        <div className="form-control bg-light border-0">{selectedUser.cne || '—'}</div>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Classe ID</label>
                        <div className="form-control bg-light border-0">{selectedUser.classeId ?? '—'}</div>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Date de naissance</label>
                        <div className="form-control bg-light border-0">{selectedUser.dateNaissance || '—'}</div>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Nom du parent</label>
                        <div className="form-control bg-light border-0">{selectedUser.nomParent || '—'}</div>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Téléphone du parent</label>
                        <div className="form-control bg-light border-0">{selectedUser.telephoneParent || '—'}</div>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Email du parent</label>
                        <div className="form-control bg-light border-0">{selectedUser.emailParent || '—'}</div>
                      </div>
                    </>
                  )}

                  {normalizedSelectedRole === 'PROFESSEUR' && (
                    <div className="col-md-12">
                      <label className="form-label">Spécialité</label>
                      <div className="form-control bg-light border-0">{getSpecialityValue(selectedUser)}</div>
                    </div>
                  )}
                </div>
              ) : null}

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

export default UsersPage;
