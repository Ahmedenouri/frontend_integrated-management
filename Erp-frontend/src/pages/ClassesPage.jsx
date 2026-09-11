import { useEffect, useState } from 'react';
import { getAllClasses } from '../api/erpApi';
import DataTable from '../components/DataTable';

const ClassesPage = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const { data } = await getAllClasses();
        setClasses(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load classes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadClasses();
  }, []);

  const columns = [
    { key: 'nom', label: 'Class' },
    { key: 'niveau', label: 'Level' },
    { key: 'anneeScolaire', label: 'Academic year' },
  ];

  return (
    <>
      <header className="page-header">
        <div className="page-title-row">
          <h1>Classes</h1>
        </div>
        <p className="page-subtitle">Academic classes available in the ERP.</p>
      </header>

      {loading ? (
        <div className="app-card rounded-card p-4 text-center">Loading classes...</div>
      ) : (
        <DataTable columns={columns} rows={classes} emptyMessage="No classes found." />
      )}
    </>
  );
};

export default ClassesPage;
