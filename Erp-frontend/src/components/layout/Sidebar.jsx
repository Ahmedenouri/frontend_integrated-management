import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Tableau de bord', icon: 'bi-grid-1x2-fill', roles: ['ROLE_DIRECTEUR', 'ROLE_RESPONSABLE_FINANCIER', 'ROLE_SURVEILLANT', 'ROLE_PROFESSEUR', 'ROLE_ETUDIANT'] },
  { to: '/students', label: 'Étudiants', icon: 'bi-people-fill', roles: ['ROLE_DIRECTEUR', 'ROLE_SURVEILLANT', 'ROLE_PROFESSEUR'] },
  { to: '/finance', label: 'Finance', icon: 'bi-credit-card-2-front-fill', roles: ['ROLE_DIRECTEUR', 'ROLE_RESPONSABLE_FINANCIER'] },
  { to: '/classes', label: 'Classes', icon: 'bi-mortarboard-fill', roles: ['ROLE_DIRECTEUR', 'ROLE_SURVEILLANT', 'ROLE_PROFESSEUR'] },
  { to: '/subjects', label: 'Matières', icon: 'bi-book-half', roles: ['ROLE_DIRECTEUR', 'ROLE_SURVEILLANT', 'ROLE_PROFESSEUR', 'ROLE_ETUDIANT'] },
  { to: '/schedule', label: 'Emploi du temps', icon: 'bi-calendar3', roles: ['ROLE_DIRECTEUR', 'ROLE_SURVEILLANT', 'ROLE_PROFESSEUR', 'ROLE_ETUDIANT'] },
  { to: '/evaluations', label: 'Évaluations', icon: 'bi-clipboard-check', roles: ['ROLE_DIRECTEUR', 'ROLE_PROFESSEUR', 'ROLE_ETUDIANT'] },
  { to: '/bulletins', label: 'Bulletins', icon: 'bi-file-earmark-text-fill', roles: ['ROLE_DIRECTEUR', 'ROLE_SURVEILLANT', 'ROLE_ETUDIANT'] },
  { to: '/attendance', label: 'Présences', icon: 'bi-calendar-check-fill', roles: ['ROLE_DIRECTEUR', 'ROLE_SURVEILLANT', 'ROLE_PROFESSEUR'] },
  { to: '/teachers', label: 'Professeurs', icon: 'bi-person-badge-fill', roles: ['ROLE_DIRECTEUR', 'ROLE_SURVEILLANT'] },
  { to: '/profile', label: 'Profil', icon: 'bi-person-circle', roles: ['ROLE_DIRECTEUR', 'ROLE_RESPONSABLE_FINANCIER', 'ROLE_SURVEILLANT', 'ROLE_PROFESSEUR', 'ROLE_ETUDIANT'] },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { hasRole } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => hasRole(item.roles));

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-title-wrap">
          <span className="sidebar-kicker">Workspace</span>
          {!collapsed && <h6>Navigation</h6>}
        </div>

        <button
          type="button"
          className="btn btn-icon-toggle"
          onClick={() => setCollapsed((current) => !current)}
          aria-label="Toggle sidebar"
        >
          <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`} />
        </button>
      </div>

      <div className="sidebar-separator" />

      <nav className="sidebar-nav">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <i className={`bi ${item.icon}`} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
