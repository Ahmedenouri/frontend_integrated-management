import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { userProfile, userRole, logout } = useAuth();

  const fullName = userProfile?.fullName || userProfile?.name || userProfile?.username || 'Utilisateur VPI';
  const normalizedRole = userRole?.replace(/^ROLE_/, '').replace(/_/g, ' ') || 'UTILISATEUR';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'VPI';

  return (
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

        <button className="btn btn-logout" type="button" onClick={logout}>
          <i className="bi bi-box-arrow-right" />
          Déconnexion
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
