import { useEffect, useState } from 'react';
import { getAllTeachers } from '../api/erpApi';
import DataTable from '../components/DataTable';

const TeachersPage = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const { data } = await getAllTeachers();
        setTeachers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load teachers:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTeachers();
  }, []);

  const columns = [
    { key: 'nom', label: 'Last name' },
    { key: 'prenom', label: 'First name' },
    { key: 'email', label: 'Email' },
    { key: 'telephone', label: 'Phone' },
    { key: 'specialite', label: 'Speciality' },
    {
      key: 'estActif',
      label: 'Status',
      render: (row) => (
        <span className={`badge-soft ${row.estActif ? 'success' : 'warning'}`}>
          {row.estActif ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <>
      <header className="page-header">
        <div className="page-title-row">
          <h1>Teachers</h1>
        </div>
        <p className="page-subtitle">Faculty information pulled from the backend registry.</p>
      </header>

      {loading ? (
        <div className="app-card rounded-card p-4 text-center">Loading teachers...</div>
      ) : (
        <DataTable columns={columns} rows={teachers} emptyMessage="No teachers found." />
      )}
    </>
  );
};

export default TeachersPage;
