import { useEffect, useState } from 'react';
import { getAllPaiements, getAllStudents, getDashboardFinancier } from '../api/erpApi';
import DataTable from '../components/DataTable';

const FinancePage = () => {
  const [stats, setStats] = useState(null);
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFinance = async () => {
      try {
        const [{ data: financeData }, { data: paiementsData }, { data: studentsData }] = await Promise.all([
          getDashboardFinancier(),
          getAllPaiements(),
          getAllStudents(),
        ]);

        const studentMap = new Map(
          Array.isArray(studentsData)
            ? studentsData.map((student) => [student.id, student])
            : []
        );

        const enrichedPaiements = Array.isArray(paiementsData)
          ? paiementsData.map((paiement) => {
              const student = studentMap.get(paiement.etudiantId);

              return {
                ...paiement,
                nom: student?.nom || '—',
                email: student?.email || '—',
              };
            })
          : [];

        setStats(financeData || {});
        setPaiements(enrichedPaiements);
      } catch (error) {
        console.error('Failed to load finance data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFinance();
  }, []);

  const columns = [
    { key: 'id', label: 'ID reçu' },
    { key: 'nom', label: 'Nom de l\'étudiant' },
    { key: 'email', label: 'Email' },
    { key: 'montant', label: 'Montant' },
    { key: 'datePaiement', label: 'Date' },
    {
      key: 'statut',
      label: 'Statut',
      render: (row) => (
        <span className={`badge-soft ${row.statut === 'PAYE' ? 'success' : 'warning'}`}>
          {row.statut || 'Inconnu'}
        </span>
      ),
    },
  ];

  return (
    <>
      <header className="page-header">
        <div className="page-title-row">
          <h1>Finance</h1>
        </div>
        <p className="page-subtitle">Live financial snapshot from the ERP API.</p>
      </header>

      {loading ? (
        <div className="app-card rounded-card p-4 text-center">Chargement des données financières...</div>
      ) : (
        <>
          <section className="stats-grid mb-4">
            <div className="app-card stat-card rounded-card">
              <span className="stat-label">Total collecté</span>
              <span className="stat-value">{stats?.totalEncaissementPercu ?? 0}</span>
            </div>
            <div className="app-card stat-card rounded-card">
              <span className="stat-label">Montant impayé</span>
              <span className="stat-value">{stats?.totalImpayes ?? 0}</span>
            </div>
            <div className="app-card stat-card rounded-card">
              <span className="stat-label">Étudiants en retard</span>
              <span className="stat-value">{stats?.nombreEtudiantsEnRetard ?? 0}</span>
            </div>
          </section>

          <DataTable columns={columns} rows={paiements} emptyMessage="Aucun paiement trouvé." />
        </>
      )}
    </>
  );
};

export default FinancePage;
