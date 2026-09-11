import { useEffect, useState } from 'react';
import { getAllBulletins } from '../api/erpApi';
import DataTable from '../components/DataTable';

const BulletinsPage = () => {
  const [bulletins, setBulletins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBulletins = async () => {
      try {
        const { data } = await getAllBulletins();
        setBulletins(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load bulletins:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBulletins();
  }, []);

  const columns = [
    { key: 'id', label: 'Bulletin ID' },
    { key: 'anneeScolaire', label: 'Academic year' },
    { key: 'semestre', label: 'Semester' },
    { key: 'moyenneGenerale', label: 'Average' },
    { key: 'etudiantId', label: 'Student ID' },
    { key: 'appreciationGenerale', label: 'General appreciation' },
  ];

  return (
    <>
      <header className="page-header">
        <div className="page-title-row">
          <h1>Bulletins</h1>
        </div>
        <p className="page-subtitle">Official report cards available in the ERP.</p>
      </header>

      {loading ? (
        <div className="app-card rounded-card p-4 text-center">Loading bulletins...</div>
      ) : (
        <DataTable columns={columns} rows={bulletins} emptyMessage="No bulletins found." />
      )}
    </>
  );
};

export default BulletinsPage;
