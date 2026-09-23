import { useEffect, useState } from 'react';
import { getMesPaiements } from '../api/erpApi';
import DataTable from '../components/DataTable';

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  for (const key of ['data', 'content', 'paiements', 'payments', 'items']) {
    if (value[key] !== undefined) return toArray(value[key]);
  }
  return value.id !== undefined ? [value] : [];
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('fr-FR');
};

const formatCurrency = (value) => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'MAD',
}).format(Number(value || 0));

const StudentPaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPayments = async () => {
      try {
        const { data } = await getMesPaiements();
        setPayments(toArray(data));
      } catch (error) {
        console.error('Failed to load student payments:', error);
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
  }, []);

  const columns = [
    { key: 'referencePaiement', label: 'Référence' },
    { key: 'typePaiement', label: 'Type' },
    { key: 'montant', label: 'Montant', render: (payment) => formatCurrency(payment.montant) },
    { key: 'datePaiement', label: 'Date', render: (payment) => formatDate(payment.datePaiement) },
    { key: 'mode', label: 'Mode' },
    { key: 'statut', label: 'Statut' },
  ];

  return (
    <>
      <header className="page-header">
        <div className="page-title-row"><h1>Historique des paiements</h1></div>
        <p className="page-subtitle">Consultez vos paiements et votre situation financière.</p>
      </header>

      {loading ? (
        <div className="app-card rounded-card p-4 text-center">Chargement des paiements...</div>
      ) : (
        <DataTable
          columns={columns}
          rows={payments}
          emptyMessage="Aucun paiement enregistré."
          tableClassName="payments-table"
        />
      )}
    </>
  );
};

export default StudentPaymentsPage;