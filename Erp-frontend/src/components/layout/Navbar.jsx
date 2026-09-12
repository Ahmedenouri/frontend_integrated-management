import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { userProfile, userRole, logout } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const fullName = userProfile?.fullName || userProfile?.name || userProfile?.username || 'Utilisateur VPI';
  const normalizedRole = userRole?.replace(/^ROLE_/, '').replace(/_/g, ' ') || 'UTILISATEUR';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'VPI';

  const openLogoutModal = () => setIsLogoutModalOpen(true);
  const closeLogoutModal = () => setIsLogoutModalOpen(false);

  const handleLogoutConfirm = () => {
    closeLogoutModal();
    logout();
  };

  return (
    <>
      <nav className="top-navbar">
        <div className="navbar-brand-group">
          <div className="brand-copy">
            <a style={{ textDecoration: 'none' }} href="/dashboard" className="brand-label">
              <span className="brand-label">Victoria Professional Institute</span>
            </a>
            <small>Système de gestion scolaire</small>
          </div>
        </div>

        <div className="navbar-actions">
          <div className="user-pill">
            <div className="avatar-circle">{initials}</div>
            <div className="user-meta">
              <strong>{fullName}</strong>
              <small className="role-pill">{normalizedRole}</small>
            </div>
          </div>

          <button className="btn btn-logout" type="button" onClick={openLogoutModal}>
            <i className="bi bi-box-arrow-right" />
            Déconnexion
          </button>
        </div>
      </nav>

      {isLogoutModalOpen && (
        <div className="student-modal-backdrop" onClick={closeLogoutModal}>
          <div className="student-modal confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-header">
              <h3>Confirmer la déconnexion</h3>
              <button className="btn-close" type="button" onClick={closeLogoutModal} aria-label="Fermer" />
            </div>

            <div className="student-modal-body">
              <p className="mb-3">
                Êtes-vous sûr de vouloir vous déconnecter <strong>{fullName}</strong> ?
              </p>

              <div className="student-modal-actions">
                <button className="btn btn-outline-secondary" type="button" onClick={closeLogoutModal}>
                  Annuler
                </button>
                <button className="btn btn-danger" type="button" onClick={handleLogoutConfirm}>
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
