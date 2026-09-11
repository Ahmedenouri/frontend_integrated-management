import { useEffect, useState } from 'react';
import { getAllEmploisDuTemps } from '../api/erpApi';
import DataTable from '../components/DataTable';

const SchedulePage = () => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const { data } = await getAllEmploisDuTemps();
        setSchedule(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load schedules:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, []);

  const columns = [
    { key: 'id', label: 'Schedule ID' },
    { key: 'semestre', label: 'Semester' },
    { key: 'classeId', label: 'Class ID' },
    { key: 'surveillantId', label: 'Supervisor ID' },
    {
      key: 'estValide',
      label: 'Status',
      render: (row) => (
        <span className={`badge-soft ${row.estValide ? 'success' : 'warning'}`}>
          {row.estValide ? 'Validated' : 'Pending'}
        </span>
      ),
    },
  ];

  return (
    <>
      <header className="page-header">
        <div className="page-title-row">
          <h1>Timetable</h1>
        </div>
        <p className="page-subtitle">School timetable records from the ERP system.</p>
      </header>

      {loading ? (
        <div className="app-card rounded-card p-4 text-center">Loading timetable...</div>
      ) : (
        <DataTable columns={columns} rows={schedule} emptyMessage="No timetable data found." />
      )}
    </>
  );
};

export default SchedulePage;
