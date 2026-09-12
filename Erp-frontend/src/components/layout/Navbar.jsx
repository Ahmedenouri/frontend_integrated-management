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
        <div className="brand-mark">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="1em" 
            height="1em" 
            fill="currentColor" 
            viewBox="0 0 16 16"
          >
            <path d="M8.211 2.047a.5.5 0 0 0-.422 0l-7.5 3.5a.5.5 0 0 0 .025.917l7.5 3a.5.5 0 0 0 .372 0L14 7.14V13a1 1 0 0 0 1 1h.5a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.28-.453l-7.5-4z"/>
            <path d="M4.179 8.242a.5.5 0 0 0-.179.682C5.226 10.835 6.6 11.5 8 11.5s2.774-.665 4-2.576a.5.5 0 1 0-.842-.538C10.226 10.165 9.1 10.5 8 10.5s-2.226-.335-3.138-2.116a.5.5 0 0 0-.683-.142z"/>
          </svg>
        </div>
        <div className="brand-copy">
          <span className="brand-label">Victoria Professional Institute</span>
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
