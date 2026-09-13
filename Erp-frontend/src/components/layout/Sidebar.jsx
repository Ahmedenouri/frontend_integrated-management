import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_GROUPS_BY_ROLE = {
  ROLE_DIRECTEUR: [
    {
      id: 'general',
      label: 'Général',
      items: [
        { to: '/', label: 'Tableau de bord', icon: 'bi-grid-1x2-fill' },
      ],
    },
    {
      id: 'finance',
      label: 'Finance',
      items: [
        { to: '/finance', label: 'Finance', icon: 'bi-credit-card-2-front-fill' },
      ],
    },
    {
      id: 'academique',
      label: 'Académique',
      items: [
        { to: '/classes', label: 'Gestion des Classes & Niveaux', icon: 'bi-mortarboard-fill' },
        { to: '/schedule', label: 'Emplois du Temps', icon: 'bi-calendar3' },
        { to: '/students', label: 'Gestion des Étudiants', icon: 'bi-people-fill' },
        { to: '/attendance', label: 'Absences & Sanctions', icon: 'bi-calendar-check-fill' },
      ],
    },
    {
      id: 'pedagogique',
      label: 'Pédagogique',
      items: [
        { to: '/evaluations', label: 'Gestion des Évaluations & Examens', icon: 'bi-clipboard-check' },
        { to: '/bulletins', label: 'Gestion des Notes & Bulletins', icon: 'bi-file-earmark-text-fill' },
        { to: '/schedule', label: 'Gestion des Séances & Cours', icon: 'bi-journal-bookmark-fill' },
        { to: '/subjects', label: 'Programmes & Matières', icon: 'bi-book-half' },
      ],
    },
    {
      id: 'administration',
      label: 'Administration',
      items: [
        { to: '/users', label: 'Utilisateurs', icon: 'bi-people' }
      ],
    },
  ],
  ROLE_RESPONSABLE_FINANCIER: [
    {
      id: 'general',
      label: 'Général',
      items: [
        { to: '/', label: 'Tableau de bord', icon: 'bi-grid-1x2-fill' },
      ],
    },
    {
      id: 'finance',
      label: 'Finance',
      items: [
        { to: '/finance', label: 'Finance', icon: 'bi-credit-card-2-front-fill' },
      ],
    },
  ],
  ROLE_SURVEILLANT: [
    {
      id: 'general',
      label: 'Général',
      items: [
        { to: '/', label: 'Tableau de bord', icon: 'bi-grid-1x2-fill' },
      ],
    },
    {
      id: 'academique',
      label: 'Académique',
      items: [
        { to: '/classes', label: 'Gestion des Classes & Niveaux', icon: 'bi-mortarboard-fill' },
        { to: '/schedule', label: 'Emplois du Temps', icon: 'bi-calendar3' },
        { to: '/students', label: 'Gestion des Étudiants', icon: 'bi-people-fill' },
        { to: '/attendance', label: 'Absences & Sanctions', icon: 'bi-calendar-check-fill' },
      ],
    },
    {
      id: 'pedagogique',
      label: 'Pédagogique',
      items: [
        { to: '/subjects', label: 'Programmes & Matières', icon: 'bi-book-half' },
      ],
    },
  ],
  ROLE_PROFESSEUR: [
    {
      id: 'general',
      label: 'Général',
      items: [
        { to: '/', label: 'Tableau de bord', icon: 'bi-grid-1x2-fill' },
      ],
    },
    {
      id: 'academique',
      label: 'Académique',
      items: [
        { to: '/classes', label: 'Gestion des Classes & Niveaux', icon: 'bi-mortarboard-fill' },
        { to: '/schedule', label: 'Emplois du Temps', icon: 'bi-calendar3' },
        { to: '/students', label: 'Gestion des Étudiants', icon: 'bi-people-fill' },
        { to: '/attendance', label: 'Absences & Sanctions', icon: 'bi-calendar-check-fill' },
      ],
    },
    {
      id: 'pedagogique',
      label: 'Pédagogique',
      items: [
        { to: '/evaluations', label: 'Gestion des Évaluations & Examens', icon: 'bi-clipboard-check' },
        { to: '/subjects', label: 'Programmes & Matières', icon: 'bi-book-half' },
      ],
    },
  ],
  ROLE_ETUDIANT: [
    {
      id: 'general',
      label: 'Général',
      items: [
        { to: '/', label: 'Tableau de bord', icon: 'bi-grid-1x2-fill' },
      ],
    },
    {
      id: 'pedagogique',
      label: 'Pédagogique',
      items: [
        { to: '/evaluations', label: 'Gestion des Évaluations & Examens', icon: 'bi-clipboard-check' },
        { to: '/bulletins', label: 'Gestion des Notes & Bulletins', icon: 'bi-file-earmark-text-fill' },
        { to: '/schedule', label: 'Gestion des Séances & Cours', icon: 'bi-journal-bookmark-fill' },
        { to: '/subjects', label: 'Programmes & Matières', icon: 'bi-book-half' },
      ],
    },
  ],
};

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({
    general: true,
    finance: true,
    academique: true,
    pedagogique: true,
    administrateur: true,
  });
  const { userRole } = useAuth();

  const visibleGroups = NAV_GROUPS_BY_ROLE[userRole] || [];

  const toggleGroup = (groupId) => {
    setExpandedGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  };

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
        {visibleGroups.map((group) => (
          <div key={group.id} className="sidebar-group">
            {!collapsed && (
              <button
                type="button"
                className={`sidebar-group-toggle group-${group.id}`}
                onClick={() => toggleGroup(group.id)}
                aria-expanded={Boolean(expandedGroups[group.id])}
              >
                <span>{group.label}</span>
                <i className={`bi ${expandedGroups[group.id] ? 'bi-chevron-down' : 'bi-chevron-right'}`} />
              </button>
            )}

            {(collapsed || expandedGroups[group.id]) && (
              <div className="sidebar-group-items">
                {group.items.map((item) => (
                  <NavLink
                    key={`${group.id}-${item.to}`}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    <i className={`bi ${item.icon}`} />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
