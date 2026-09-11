import { useEffect, useState } from 'react';
import { getAllEvaluations } from '../api/erpApi';
import DataTable from '../components/DataTable';

const EvaluationsPage = () => {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvaluations = async () => {
      try {
        const { data } = await getAllEvaluations();
        setEvaluations(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load evaluations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvaluations();
  }, []);

  const columns = [
    { key: 'titre', label: 'Title' },
    { key: 'typeEval', label: 'Type' },
    { key: 'dateEvaluation', label: 'Date' },
    { key: 'coefficient', label: 'Coefficient' },
    { key: 'matiereId', label: 'Subject ID' },
  ];

  return (
    <>
      <header className="page-header">
        <div className="page-title-row">
          <h1>Evaluations</h1>
        </div>
        <p className="page-subtitle">Assessment records available in the academic module.</p>
      </header>

      {loading ? (
        <div className="app-card rounded-card p-4 text-center">Loading evaluations...</div>
      ) : (
        <DataTable columns={columns} rows={evaluations} emptyMessage="No evaluations found." />
      )}
    </>
  );
};

export default EvaluationsPage;
