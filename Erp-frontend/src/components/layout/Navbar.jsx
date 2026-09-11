import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { userProfile, userRole, logout } = useAuth();

  const fullName = userProfile?.fullName || userProfile?.name || userProfile?.username || 'Utilisateur ECOSCOL';
  const initials = fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <nav className="top-navbar">
      <div className="navbar-brand-group">
        <div className="brand-mark">E</div>
        <div className="brand-copy">
          <span className="brand-label">ECOSCOL ERP</span>
          <small>Système de gestion scolaire</small>
        </div>
      </div>

      <div className="navbar-actions">
        <div className="nav-search d-none d-md-flex">
          <i className="bi bi-search" />
          <span>Rechercher des modules</span>
        </div>

        <div className="user-pill">
          <div className="avatar-circle">{initials}</div>
          <div className="user-meta">
            <strong>{fullName}</strong>
            <small>{userRole || 'Utilisateur authentifié'}</small>
          </div>
        </div>

        <button className="btn btn-logout" type="button" onClick={logout}>
          <i className="bi bi-box-arrow-right" />
          Déconnexion
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
