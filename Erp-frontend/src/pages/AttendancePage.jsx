import { useEffect, useState } from 'react';
import { getAllAbsences, getDashboardDiscipline } from '../api/erpApi';
import DataTable from '../components/DataTable';

const AttendancePage = () => {
  const [stats, setStats] = useState(null);
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        const [{ data: disciplineData }, { data: absencesData }] = await Promise.all([
          getDashboardDiscipline(),
          getAllAbsences(),
        ]);

        setStats(disciplineData || {});
        setAbsences(Array.isArray(absencesData) ? absencesData : []);
      } catch (error) {
        console.error('Failed to load attendance data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, []);

  const columns = [
    { key: 'id', label: 'Absence ID' },
    { key: 'date', label: 'Date' },
    { key: 'motif', label: 'Reason' },
    {
      key: 'justifiee',
      label: 'Justified',
      render: (row) => (
        <span className={`badge-soft ${row.justifiee ? 'success' : 'danger'}`}>
          {row.justifiee ? 'Yes' : 'No'}
        </span>
      ),
    },
  ];

  return (
    <>
      <header className="page-header">
        <div className="page-title-row">
          <h1>Attendance</h1>
        </div>
        <p className="page-subtitle">Discipline and attendance metrics sourced from the backend.</p>
      </header>

      {loading ? (
        <div className="app-card rounded-card p-4 text-center">Loading attendance data...</div>
      ) : (
        <>
          <section className="stats-grid mb-4">
            <div className="app-card stat-card rounded-card">
              <span className="stat-label">Total absences</span>
              <span className="stat-value">{stats?.totalAbsences ?? 0}</span>
            </div>
            <div className="app-card stat-card rounded-card">
              <span className="stat-label">Hours lost</span>
              <span className="stat-value">{stats?.totalHeuresAbsences ?? 0}</span>
            </div>
            <div className="app-card stat-card rounded-card">
              <span className="stat-label">Total sanctions</span>
              <span className="stat-value">{stats?.totalSanctions ?? 0}</span>
            </div>
          </section>

          <DataTable columns={columns} rows={absences} emptyMessage="No absences found." />
        </>
      )}
    </>
  );
};

export default AttendancePage;
