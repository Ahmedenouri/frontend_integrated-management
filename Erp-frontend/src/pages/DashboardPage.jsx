const stats = [
  { label: 'Total students', value: '1,248', trend: '+12.4%', tone: 'positive', icon: 'bi-people-fill' },
  { label: 'Fees collected', value: '$48.6K', trend: '+8.1%', tone: 'positive', icon: 'bi-currency-dollar' },
  { label: 'Attendance rate', value: '94.2%', trend: '+1.3%', tone: 'positive', icon: 'bi-calendar-check-fill' },
  { label: 'Pending actions', value: '18', trend: '-3.2%', tone: 'warning', icon: 'bi-exclamation-triangle-fill' },
];

const tableRows = [
  { student: 'Amine Benali', className: 'Grade 10-A', amount: '$320.00', status: 'Paid', badge: 'success' },
  { student: 'Sara Idrissi', className: 'Grade 9-B', amount: '$180.00', status: 'Pending', badge: 'warning' },
  { student: 'Youssef El Mouta', className: 'Grade 11-C', amount: '$540.00', status: 'Paid', badge: 'success' },
  { student: 'Nadia Rahmouni', className: 'Grade 8-A', amount: '$90.00', status: 'Overdue', badge: 'danger' },
];

const recentActivities = [
  { title: 'New admission approved', detail: 'Grade 9 • 11 minutes ago' },
  { title: 'Tuition payment posted', detail: 'Finance • 25 minutes ago' },
  { title: 'Attendance synced', detail: 'Surveillance • 1 hour ago' },
  { title: 'Teacher schedule updated', detail: 'Academic team • 2 hours ago' },
];

const DashboardPage = () => {
  return (
    <>
      <header className="page-header">
        <div className="page-title-row">
          <h1>Overview</h1>
        </div>
        <p className="page-subtitle">A consolidated view of campus operations, finance, and academic performance.</p>
      </header>

      <section className="stats-grid mb-4">
        {stats.map((stat) => (
          <div key={stat.label} className="app-card stat-card rounded-card">
            <div className="stat-icon">
              <i className={`bi ${stat.icon}`} />
            </div>
            <span className="stat-label">{stat.label}</span>
            <span className="stat-value">{stat.value}</span>
            <span className={`trend ${stat.tone}`}>{stat.trend}</span>
          </div>
        ))}
      </section>

      <section className="card-grid">
        <div className="app-card rounded-card table-card">
          <div className="card-header">
            <h3>Recent finance activity</h3>
            <button type="button" className="btn btn-sm btn-link text-primary px-0">
              View all
            </button>
          </div>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={`${row.student}-${row.amount}`}>
                    <td>{row.student}</td>
                    <td>{row.className}</td>
                    <td>{row.amount}</td>
                    <td>
                      <span className={`badge-soft ${row.badge}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="app-card rounded-card">
          <div className="card-header">
            <h3>Recent activity</h3>
          </div>

          <ul className="activity-list list-unstyled">
            {recentActivities.map((item) => (
              <li key={item.title} className="activity-item">
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </div>
                <i className="bi bi-arrow-up-right-circle text-primary" />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
};

export default DashboardPage;
