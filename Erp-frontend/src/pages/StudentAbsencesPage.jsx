import { useEffect, useState } from 'react';
import { getMesAbsences, getMesSeances } from '../api/erpApi';
import DataTable from '../components/DataTable';

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  for (const key of ['data', 'content', 'absences', 'items', 'professeurs', 'teachers', 'seances', 'sessions']) {
    if (value[key] !== undefined) return toArray(value[key]);
  }

  return value.id !== undefined ? [value] : [];
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(`${value}`.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('fr-FR');
};

const formatSession = (session) => {
  if (!session) return null;
  const time = [session.heureDebut, session.heureFin].filter(Boolean).join(' - ');
  return [session.jour, time].filter(Boolean).join(' | ');
};

const StudentAbsencesPage = () => {
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAbsences = async () => {
      try {
        const [absencesResult, sessionsResult] = await Promise.allSettled([
          getMesAbsences(),
          getMesSeances(),
        ]);
        const absenceData = absencesResult.status === 'fulfilled' ? absencesResult.value.data : [];
        const sessionData = sessionsResult.status === 'fulfilled' ? sessionsResult.value.data : [];
        const sessions = toArray(sessionData);
        const sessionById = new Map(sessions.map((session) => [String(session.id), session]));

        setAbsences(toArray(absenceData).map((absence) => {
          const session = absence.seance
            || absence.session
            || sessionById.get(String(absence.seanceId));

          return { ...absence, seance: session };
        }));
      } catch (error) {
        console.error('Failed to load student absences:', error);
        setAbsences([]);
      } finally {
        setLoading(false);
      }
    };

    loadAbsences();
  }, []);

  const columns = [
    { key: 'dateAbsence', label: 'Date', render: (absence) => formatDate(absence.dateAbsence) },
    { key: 'nombreHeures', label: 'Heures' },
    {
      key: 'seance',
      label: 'Séance',
      render: (absence) => formatSession(absence.seance) || absence.seanceId || '—',
    },
    {
      key: 'estJustifiee',
      label: 'Justifiée',
      render: (absence) => (
        <span className={`badge-soft ${absence.estJustifiee ? 'success' : 'danger'}`}>
          {absence.estJustifiee ? 'Oui' : 'Non'}
        </span>
      ),
    },
    { key: 'motifJustification', label: 'Motif' },
  ];

  return (
    <>
      <header className="page-header">
        <div className="page-title-row"><h1>Mes absences</h1></div>
        <p className="page-subtitle">Consultez l’historique de vos absences et justifications.</p>
      </header>

      {loading ? (
        <div className="app-card rounded-card p-4 text-center">Chargement des absences...</div>
      ) : (
        <DataTable
          columns={columns}
          rows={absences}
          emptyMessage="Aucune absence enregistrée."
          tableClassName="absences-table"
        />
      )}
    </>
  );
};

export default StudentAbsencesPage;