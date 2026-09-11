import { useEffect, useState } from 'react';
import { getAllMatieres } from '../api/erpApi';
import DataTable from '../components/DataTable';

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const { data } = await getAllMatieres();
        setSubjects(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load subjects:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSubjects();
  }, []);

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'intitule', label: 'Subject' },
    { key: 'coefficient', label: 'Coefficient' },
    { key: 'volumeHoraire', label: 'Weekly hours' },
  ];

  return (
    <>
      <header className="page-header">
        <div className="page-title-row">
          <h1>Subjects</h1>
        </div>
        <p className="page-subtitle">Academic subjects managed by ECOSCOL.</p>
      </header>

      {loading ? (
        <div className="app-card rounded-card p-4 text-center">Loading subjects...</div>
      ) : (
        <DataTable columns={columns} rows={subjects} emptyMessage="No subjects found." />
      )}
    </>
  );
};

export default SubjectsPage;
