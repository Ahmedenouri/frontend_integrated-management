import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { userProfile, userRole, logout } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const fullName =
    userProfile?.fullName ||
    [userProfile?.nom, userProfile?.prenom].filter(Boolean).join(' ') ||
    userProfile?.name ||
    userProfile?.username ||
    userProfile?.email ||
    'Utilisateur VPI';
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
          <div className="user-dropdown">
            <button
              type="button"
              className="user-pill user-dropdown-toggle"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
            >
              <div className="avatar-circle">{initials}</div>

              <div className="user-meta">
                <strong>{fullName}</strong>
                <small className="role-pill">{normalizedRole}</small>
              </div>

              <i className={`bi bi-chevron-down user-dropdown-icon ${isUserMenuOpen ? 'open' : ''}`} />
            </button>

            {isUserMenuOpen && (
              <div className="user-dropdown-menu">
                <div className="user-dropdown-header">
                  <div className="avatar-circle user-dropdown-avatar">{initials}</div>

                  <div className="user-dropdown-header-text">
                    <strong>{fullName}</strong>
                    <small>{userProfile?.email || userProfile?.username || 'email non disponible'}</small>
                  </div>
                </div>

                <NavLink to="/profile" className="user-dropdown-item" onClick={() => setIsUserMenuOpen(false)}>
                  <i className="bi bi-person-circle" />
                  Profil
                </NavLink>

                <button
                  type="button"
                  className="user-dropdown-item user-dropdown-logout"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    openLogoutModal();
                  }}
                >
                  <i className="bi bi-box-arrow-right" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
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
