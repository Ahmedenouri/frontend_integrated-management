import { useEffect, useMemo, useState } from 'react';
import {
  createEmploiDuTemps,
  createSeance,
  deleteEmploiDuTemps,
  deleteSeance,
  getAllClasses,
  getAllEmploisDuTemps,
  getAllMatieres,
  getAllSalles,
  getAllSeances,
  getMesSeances,
  getAllSurveillants,
  getAllTeachers,
  getMonEmploiDuTemps,
  updateEmploiDuTemps,
  updateSeance,
} from '../api/erpApi';
import DataTable from '../components/DataTable';
import { useAuth } from '../context/AuthContext';
import { useGlobalMessage } from '../utils/notifications';

const timetableFormInitial = { classeId: '', semestre: '1', surveillantId: '', estValide: false };
const sessionFormInitial = { jour: 'LUNDI', heureDebut: '', heureFin: '', emploiDuTempsId: '', professeurId: '', salleId: '', matiereId: '' };
const days = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  for (const key of ['data', 'content', 'items', 'emploisDuTemps', 'sessions', 'seances']) {
    if (value[key] !== undefined) {
      const nested = asArray(value[key]);
      if (nested.length) return nested;
    }
  }

  return [value];
};
const label = (value, fallback = '—') => {
  if (!value) return fallback;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return value.nom || value.name || value.intitule || value.libelle || value.codeSalle || value.titre || fallback;
};
const fullName = (person) => [person?.prenom, person?.nom].filter(Boolean).join(' ') || person?.fullName || person?.name || person?.email || '—';
const findName = (items, id, fallback) => {
  const match = items.find((item) => String(item.id) === String(id));
  return match ? fullName(match) : label(fallback);
};

const SchedulePage = () => {
  const { userRole, userProfile } = useAuth();
  const canManage = ['ROLE_DIRECTEUR', 'ROLE_SURVEILLANT'].includes(userRole);
  const [timetables, setTimetables] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timetableForm, setTimetableForm] = useState(timetableFormInitial);
  const [sessionForm, setSessionForm] = useState(sessionFormInitial);
  const [editingTimetableId, setEditingTimetableId] = useState(null);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [, setErrorMessage] = useGlobalMessage('error');
  const [, setSuccessMessage] = useGlobalMessage('success');

  const loadSchedule = async () => {
    try {
      const commonRequests = [getAllClasses(), getAllTeachers(), getAllSurveillants(), getAllMatieres(), getAllSalles()];
      const scheduleRequest = canManage ? getAllEmploisDuTemps() : getMonEmploiDuTemps();
      const sessionsRequest = canManage ? getAllSeances() : getMesSeances();
      const [scheduleResult, sessionsResult, classesResult, teachersResult, supervisorsResult, subjectsResult, roomsResult] = await Promise.allSettled([
        scheduleRequest,
        sessionsRequest,
        ...commonRequests,
      ]);

      setTimetables(asArray(scheduleResult.status === 'fulfilled' ? scheduleResult.value.data : []));
      setSessions(asArray(sessionsResult.status === 'fulfilled' ? sessionsResult.value.data : []));
      setClasses(asArray(classesResult.status === 'fulfilled' ? classesResult.value.data : []));
      setTeachers(asArray(teachersResult.status === 'fulfilled' ? teachersResult.value.data : []));
      setSupervisors(asArray(supervisorsResult.status === 'fulfilled' ? supervisorsResult.value.data : []));
      setSubjects(asArray(subjectsResult.status === 'fulfilled' ? subjectsResult.value.data : []));
      setRooms(asArray(roomsResult.status === 'fulfilled' ? roomsResult.value.data : []));
    } catch (error) {
      console.error('Failed to load schedule:', error);
      setErrorMessage('Impossible de charger les emplois du temps.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(loadSchedule, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  const timetableById = useMemo(() => new Map(timetables.map((item) => [String(item.id), item])), [timetables]);
  const displayedSessions = sessions;
  const sessionsByDay = useMemo(
    () => days.reduce((schedule, day) => {
      schedule[day] = displayedSessions
        .filter((session) => String(session.jour || '').toUpperCase() === day)
        .sort((first, second) => String(first.heureDebut || '').localeCompare(String(second.heureDebut || '')));
      return schedule;
    }, {}),
    [displayedSessions]
  );

  const getSessionDetails = (session) => {
    const timetable = timetableById.get(String(session.emploiDuTempsId));
    return {
      classe: session.classeNom || session.classe?.nom || (timetable ? findName(classes, timetable.classeId) : 'Classe non renseignée'),
      matiere: session.matiereNom || session.matiere?.intitule || findName(subjects, session.matiereId),
      salle: session.salleNom || session.salle?.codeSalle || rooms.find((room) => String(room.id) === String(session.salleId))?.codeSalle || 'Salle non renseignée',
    };
  };

  const openCreateTimetable = () => {
    setEditingTimetableId(null);
    setTimetableForm(timetableFormInitial);
    setIsTimetableModalOpen(true);
  };

  const openEditTimetable = (item) => {
    setEditingTimetableId(item.id);
    setTimetableForm({ classeId: String(item.classeId || ''), semestre: String(item.semestre || 1), surveillantId: String(item.surveillantId || ''), estValide: Boolean(item.estValide) });
    setIsTimetableModalOpen(true);
  };

  const openCreateSession = (timetableId = '') => {
    setEditingSessionId(null);
    setSessionForm({ ...sessionFormInitial, emploiDuTempsId: String(timetableId || '') });
    setIsSessionModalOpen(true);
  };

  const openEditSession = (item) => {
    setEditingSessionId(item.id);
    setSessionForm({ jour: item.jour || 'LUNDI', heureDebut: item.heureDebut || '', heureFin: item.heureFin || '', emploiDuTempsId: String(item.emploiDuTempsId || ''), professeurId: String(item.professeurId || ''), salleId: String(item.salleId || ''), matiereId: String(item.matiereId || '') });
    setIsSessionModalOpen(true);
  };

  const handleTimetableSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { classeId: Number(timetableForm.classeId), semestre: Number(timetableForm.semestre), estValide: timetableForm.estValide, ...(timetableForm.surveillantId ? { surveillantId: Number(timetableForm.surveillantId) } : {}) };
      if (!payload.classeId) throw new Error('La classe est obligatoire.');
      if (editingTimetableId) await updateEmploiDuTemps(editingTimetableId, payload);
      else await createEmploiDuTemps(payload);
      setSuccessMessage(editingTimetableId ? 'Emploi du temps modifié.' : 'Emploi du temps créé.');
      setIsTimetableModalOpen(false);
      await loadSchedule();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || error.message || 'Impossible d’enregistrer l’emploi du temps.');
    } finally { setSaving(false); }
  };

  const handleSessionSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...sessionForm, emploiDuTempsId: Number(sessionForm.emploiDuTempsId), professeurId: sessionForm.professeurId ? Number(sessionForm.professeurId) : undefined, salleId: sessionForm.salleId ? Number(sessionForm.salleId) : undefined, matiereId: sessionForm.matiereId ? Number(sessionForm.matiereId) : undefined };
      if (!payload.emploiDuTempsId || !payload.heureDebut || !payload.heureFin) throw new Error('Emploi du temps, horaires et jour sont obligatoires.');
      if (editingSessionId) await updateSeance(editingSessionId, payload);
      else await createSeance(payload);
      setSuccessMessage(editingSessionId ? 'Séance modifiée.' : 'Séance programmée.');
      setIsSessionModalOpen(false);
      await loadSchedule();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || error.message || 'Impossible d’enregistrer la séance.');
    } finally { setSaving(false); }
  };

  const confirmDelete = (type, item) => setPendingDelete({ type, item });
  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      if (pendingDelete.type === 'timetable') await deleteEmploiDuTemps(pendingDelete.item.id);
      else await deleteSeance(pendingDelete.item.id);
      setPendingDelete(null);
      setSuccessMessage(pendingDelete.type === 'timetable' ? 'Emploi du temps supprimé.' : 'Séance supprimée.');
      await loadSchedule();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Impossible de supprimer cet élément.');
      setPendingDelete(null);
    }
  };

  const timetableColumns = [
    { key: 'classeId', label: 'Classe', render: (row) => findName(classes, row.classeId) },
    { key: 'semestre', label: 'Semestre', render: (row) => `Semestre ${row.semestre}` },
    { key: 'surveillantId', label: 'Surveillant', render: (row) => findName(supervisors, row.surveillantId) },
    { key: 'estValide', label: 'Statut', render: (row) => <span className={`badge-soft ${row.estValide ? 'success' : 'warning'}`}>{row.estValide ? 'Validé' : 'Brouillon'}</span> },
    ...(canManage ? [{ key: 'actions', label: 'Actions', render: (row) => <div className="d-flex flex-column align-items-start gap-2"><button className="btn btn-sm btn-outline-primary" type="button" onClick={() => openEditTimetable(row)}>Modifier</button><button className="btn btn-sm btn-outline-success" type="button" onClick={() => openCreateSession(row.id)}>Ajouter séance</button><button className="btn btn-sm btn-outline-danger" type="button" onClick={() => confirmDelete('timetable', row)}>Supprimer</button></div> }] : []),
  ];

  const sessionColumns = [
    { key: 'jour', label: 'Jour' },
    { key: 'heureDebut', label: 'Début' },
    { key: 'heureFin', label: 'Fin' },
    { key: 'professeurId', label: 'Professeur', render: (row) => row.professeurNom || row.professeur?.nom || findName(teachers, row.professeurId, String(row.professeurId) === String(userProfile?.id) ? userProfile : row.professeur) },
    ...(canManage ? [{ key: 'actions', label: 'Actions', render: (row) => <div className="d-flex flex-column align-items-start gap-2"><button className="btn btn-sm btn-outline-primary" type="button" onClick={() => openEditSession(row)}>Modifier</button><button className="btn btn-sm btn-outline-danger" type="button" onClick={() => confirmDelete('session', row)}>Supprimer</button></div> }] : []),
  ];

  return <>
    <header className="page-header"><div className="page-title-row"><h1>Emplois du temps</h1>{canManage && <button className="btn btn-primary" type="button" onClick={openCreateTimetable}>Créer un emploi du temps</button>}</div><p className="page-subtitle">Programmez les classes, semestres, jours, horaires, professeurs, matières et salles.</p></header>
    {loading ? <div className="app-card rounded-card p-4 text-center">Chargement des emplois du temps...</div> : <>
      {canManage && <DataTable columns={timetableColumns} rows={timetables} emptyMessage="Aucun emploi du temps trouvé." />}
      {!canManage && <section className="personal-schedule mt-4" aria-label="Mon planning hebdomadaire">
        <div className="personal-schedule-heading"><div><span className="eyebrow">Mon planning</span><h2>Mes séances de la semaine</h2></div><span className="personal-schedule-count">{displayedSessions.length} séance{displayedSessions.length === 1 ? '' : 's'}</span></div>
        <div className="personal-schedule-grid">
          {days.map((day) => <div className="personal-schedule-day" key={day}><h3>{day}</h3>{sessionsByDay[day].length ? sessionsByDay[day].map((session) => { const details = getSessionDetails(session); return <article className="personal-schedule-session" key={session.id}><strong>{session.heureDebut || '—'} - {session.heureFin || '—'}</strong><span>{details.matiere}</span><small>{details.classe}</small><small>{details.salle}</small></article>; }) : <p className="personal-schedule-empty">Aucune séance</p>}</div>)}
        </div>
      </section>}
      <div className="mt-4"><div className="d-flex justify-content-between align-items-center mb-3"><h3>Séances programmées</h3>{canManage && <button className="btn btn-outline-primary" type="button" onClick={() => openCreateSession()}>Ajouter une séance</button>}</div><DataTable columns={sessionColumns} rows={displayedSessions} emptyMessage="Aucune séance programmée." /></div>
    </>}

    {isTimetableModalOpen && <div className="student-modal-backdrop" onClick={() => setIsTimetableModalOpen(false)}><div className="student-modal confirm-modal" onClick={(event) => event.stopPropagation()}><div className="student-modal-header"><h3>{editingTimetableId ? 'Modifier l’emploi du temps' : 'Créer un emploi du temps'}</h3><button className="btn-close" type="button" onClick={() => setIsTimetableModalOpen(false)} aria-label="Fermer" /></div><div className="student-modal-body"><form onSubmit={handleTimetableSubmit}><div className="row g-3"><div className="col-md-6"><label className="form-label">Classe</label><select className="form-select" value={timetableForm.classeId} onChange={(event) => setTimetableForm({ ...timetableForm, classeId: event.target.value })} required><option value="">Choisir une classe</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.nom || `Classe ${item.id}`}</option>)}</select></div><div className="col-md-6"><label className="form-label">Semestre</label><select className="form-select" value={timetableForm.semestre} onChange={(event) => setTimetableForm({ ...timetableForm, semestre: event.target.value })}><option value="1">Semestre 1</option><option value="2">Semestre 2</option></select></div><div className="col-md-12"><label className="form-label">Surveillant responsable</label><select className="form-select" value={timetableForm.surveillantId} onChange={(event) => setTimetableForm({ ...timetableForm, surveillantId: event.target.value })}><option value="">Choisir un surveillant</option>{supervisors.map((item) => <option key={item.id} value={item.id}>{fullName(item)}</option>)}</select></div><div className="col-12"><div className="form-check"><input className="form-check-input" type="checkbox" checked={timetableForm.estValide} onChange={(event) => setTimetableForm({ ...timetableForm, estValide: event.target.checked })} id="scheduleValidated" /><label className="form-check-label" htmlFor="scheduleValidated">Emploi du temps validé</label></div></div></div><div className="student-modal-actions"><button className="btn btn-outline-secondary" type="button" onClick={() => setIsTimetableModalOpen(false)}>Annuler</button><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button></div></form></div></div></div>}

    {isSessionModalOpen && <div className="student-modal-backdrop" onClick={() => setIsSessionModalOpen(false)}><div className="student-modal confirm-modal" onClick={(event) => event.stopPropagation()}><div className="student-modal-header"><h3>{editingSessionId ? 'Modifier la séance' : 'Programmer une séance'}</h3><button className="btn-close" type="button" onClick={() => setIsSessionModalOpen(false)} aria-label="Fermer" /></div><div className="student-modal-body"><form onSubmit={handleSessionSubmit}><div className="row g-3"><div className="col-md-6"><label className="form-label">Emploi du temps</label><select className="form-select" value={sessionForm.emploiDuTempsId} onChange={(event) => setSessionForm({ ...sessionForm, emploiDuTempsId: event.target.value })} required><option value="">Choisir un emploi</option>{timetables.map((item) => <option key={item.id} value={item.id}>{findName(classes, item.classeId)} • Semestre {item.semestre}</option>)}</select></div><div className="col-md-6"><label className="form-label">Jour</label><select className="form-select" value={sessionForm.jour} onChange={(event) => setSessionForm({ ...sessionForm, jour: event.target.value })}>{days.map((day) => <option key={day} value={day}>{day}</option>)}</select></div><div className="col-md-6"><label className="form-label">Heure début</label><input className="form-control" type="time" value={sessionForm.heureDebut} onChange={(event) => setSessionForm({ ...sessionForm, heureDebut: event.target.value })} required /></div><div className="col-md-6"><label className="form-label">Heure fin</label><input className="form-control" type="time" value={sessionForm.heureFin} onChange={(event) => setSessionForm({ ...sessionForm, heureFin: event.target.value })} required /></div><div className="col-md-4"><label className="form-label">Professeur</label><select className="form-select" value={sessionForm.professeurId} onChange={(event) => setSessionForm({ ...sessionForm, professeurId: event.target.value })}><option value="">Choisir</option>{teachers.map((item) => <option key={item.id} value={item.id}>{fullName(item)}</option>)}</select></div><div className="col-md-4"><label className="form-label">Matière</label><select className="form-select" value={sessionForm.matiereId} onChange={(event) => setSessionForm({ ...sessionForm, matiereId: event.target.value })}><option value="">Choisir</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.nom || item.libelle || `Matière ${item.id}`}</option>)}</select></div><div className="col-md-4"><label className="form-label">Salle</label><select className="form-select" value={sessionForm.salleId} onChange={(event) => setSessionForm({ ...sessionForm, salleId: event.target.value })}><option value="">Choisir</option>{rooms.map((item) => <option key={item.id} value={item.id}>{item.codeSalle || `Salle ${item.id}`}</option>)}</select></div></div><div className="student-modal-actions"><button className="btn btn-outline-secondary" type="button" onClick={() => setIsSessionModalOpen(false)}>Annuler</button><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer la séance'}</button></div></form></div></div></div>}

    {pendingDelete && <div className="student-modal-backdrop" onClick={() => setPendingDelete(null)}><div className="student-modal confirm-modal" onClick={(event) => event.stopPropagation()}><div className="student-modal-header"><h3>Confirmer la suppression</h3><button className="btn-close" type="button" onClick={() => setPendingDelete(null)} aria-label="Fermer" /></div><div className="student-modal-body"><p>Voulez-vous supprimer cet élément de l’emploi du temps ?</p><div className="student-modal-actions"><button className="btn btn-outline-secondary" type="button" onClick={() => setPendingDelete(null)}>Annuler</button><button className="btn btn-danger" type="button" onClick={handleDelete}>Supprimer</button></div></div></div></div>}
  </>;
};

export default SchedulePage;
