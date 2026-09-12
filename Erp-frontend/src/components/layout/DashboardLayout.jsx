const DashboardLayout = ({ title, subtitle, actions, children }) => {
  return (
    <div className="dashboard-layout">
      <header className="page-header">
        <div className="page-title-row">
          <div className="page-title-copy">
            <span className="eyebrow">VPI</span>
            <h1>{title}</h1>
          </div>
          {actions && <div className="page-header-actions">{actions}</div>}
        </div>

        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </header>

      <div className="dashboard-content">{children}</div>
    </div>
  );
};

export default DashboardLayout;
