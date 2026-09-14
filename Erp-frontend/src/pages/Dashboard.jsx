import { useEffect, useMemo, useState } from 'react';
import axiosClient from '../api/axiosClient';
import {
  addNote,
  addPaiement,
  addRecu,
  addSanction,
  getAllAbsences,
  getAllClasses,
  getAllMatieres,
  getAllPaiements,
  getAllStudents,
  getAllTeachers,
  getDashboardDiscipline,
  getDashboardFinancier,
  getDashboardStats,
  getMesAbsences,
  getMesClasses,
  getMesEtudiants,
  getMesNotes,
  getMesSeances,
} from '../api/erpApi';
import { useAuth } from '../context/AuthContext';
import { useGlobalMessage } from '../utils/notifications';

const initialPaymentForm = {
  referencePaiement: '',
  typePaiement: 'MENSUALITE',
  montant: '',
  datePaiement: '',
  mode: 'VIREMENT',
  statut: 'PAYE',
  etudiantId: '',
  responsableFinancierId: '',
};

const initialReceiptForm = {
  numeroRecu: '',
  dateEmission: '',
  montantPaye: '',
  paiementId: '',
};

const initialSanctionForm = {
  etudiantId: '',
  type: 'CONVOCATION_PARENTS',
  motif: '',
  dateEmission: '',
  totalAbsencesAuMoment: '',
  estTraitee: false,
};

const initialNoteForm = {
  etudiantId: '',
  evaluationId: '',
  valeur: '',
  appreciation: '',
  dateSaisie: '',
};

const formatDate = (value) => {
  if (!value) {
    return '—';
  }

  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return value;
  }

  return dateValue.toLocaleDateString('fr-FR');
};

const formatCurrency = (value) => {
  const numericValue = Number(value || 0);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'MAD',
  }).format(numericValue);
};

const Dashboard = () => {
  const { userRole, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState({});
  const [paymentRows, setPaymentRows] = useState([]);
  const [absenceRows, setAbsenceRows] = useState([]);
  const [studentRows, setStudentRows] = useState([]);
  const [teacherRows, setTeacherRows] = useState([]);
  const [classRows, setClassRows] = useState([]);
  const [subjectRows, setSubjectRows] = useState([]);
  const [timeTableRows, setTimeTableRows] = useState([]);
  const [noteRows, setNoteRows] = useState([]);
  const [classAssignments, setClassAssignments] = useState([]);
  const [studentAssignments, setStudentAssignments] = useState([]);
  const [message, setMessage] = useGlobalMessage('success');
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [receiptForm, setReceiptForm] = useState(initialReceiptForm);
  const [sanctionForm, setSanctionForm] = useState(initialSanctionForm);
  const [noteForm, setNoteForm] = useState(initialNoteForm);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const normalizedRole = userRole || 'ROLE_ETUDIANT';

        if (normalizedRole === 'ROLE_DIRECTEUR') {
          const [{ data: stats }, { data: students }, { data: teachers }, { data: paiements }, { data: absences }, { data: classes }, { data: matieres }] = await Promise.all([
            getDashboardStats(),
            getAllStudents(),
            getAllTeachers(),
            getAllPaiements(),
            getAllAbsences(),
            getAllClasses(),
            getAllMatieres(),
          ]);

          setDashboard(stats || {});
          setStudentRows(Array.isArray(students) ? students : []);
          setTeacherRows(Array.isArray(teachers) ? teachers : []);
          setPaymentRows(Array.isArray(paiements) ? paiements : []);
          setAbsenceRows(Array.isArray(absences) ? absences : []);
          setClassRows(Array.isArray(classes) ? classes : []);
          setSubjectRows(Array.isArray(matieres) ? matieres : []);
        } else if (normalizedRole === 'ROLE_RESPONSABLE_FINANCIER') {
          const [{ data: financierData }, { data: paiements }, { data: students }, { data: classes }] = await Promise.all([
            getDashboardFinancier(),
            getAllPaiements(),
            getAllStudents(),
            getAllClasses(),
          ]);

          setDashboard(financierData || {});
          setPaymentRows(Array.isArray(paiements) ? paiements : []);
          setStudentRows(Array.isArray(students) ? students : []);
          setClassRows(Array.isArray(classes) ? classes : []);
        } else if (normalizedRole === 'ROLE_SURVEILLANT') {
          const [{ data: disciplineData }, { data: absences }, { data: students }] = await Promise.all([
            getDashboardDiscipline(),
            getAllAbsences(),
            getAllStudents(),
          ]);

          setDashboard(disciplineData || {});
          setAbsenceRows(Array.isArray(absences) ? absences : []);
          setStudentRows(Array.isArray(students) ? students : []);
        } else if (normalizedRole === 'ROLE_PROFESSEUR') {
          const [{ data: classes }, { data: students }, { data: schedule }, { data: notes }] = await Promise.all([
            getMesClasses(),
            getMesEtudiants(),
            getMesSeances(),
            getMesNotes(),
          ]);

          setClassAssignments(Array.isArray(classes) ? classes : []);
          setStudentAssignments(Array.isArray(students) ? students : []);
          setTimeTableRows(Array.isArray(schedule) ? schedule : []);
          setNoteRows(Array.isArray(notes) ? notes : []);
        } else if (normalizedRole === 'ROLE_ETUDIANT') {
          const [{ data: absences }, { data: schedule }, { data: notes }, { data: classes }, { data: matieres }] = await Promise.all([
            getMesAbsences(),
            getMesSeances(),
            getMesNotes(),
            getAllClasses(),
            getAllMatieres(),
          ]);

          setAbsenceRows(Array.isArray(absences) ? absences : []);
          setTimeTableRows(Array.isArray(schedule) ? schedule : []);
          setNoteRows(Array.isArray(notes) ? notes : []);
          setClassRows(Array.isArray(classes) ? classes : []);
          setSubjectRows(Array.isArray(matieres) ? matieres : []);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userRole]);

  useEffect(() => {
    if (userProfile?.id) {
      setPaymentForm((current) => ({ ...current, responsableFinancierId: userProfile.id }));
      setSanctionForm((current) => ({ ...current, surveillantId: userProfile.id }));
      setNoteForm((current) => ({ ...current, professeurId: userProfile.id }));
    }
  }, [userProfile]);

  const role = userRole || 'ROLE_ETUDIANT';

  const getStudentClassLabel = (student, classes = []) => {
    const rawClasse = student?.classe;

    if (rawClasse && typeof rawClasse === 'object') {
      return rawClasse.nom || rawClasse.name || rawClasse.libelle || rawClasse.label || '—';
    }

    if (rawClasse !== undefined && rawClasse !== null && rawClasse !== '') {
      const matchedClass = classes.find((item) => String(item.id) === String(rawClasse));

      if (matchedClass) {
        return matchedClass.nom || matchedClass.name || matchedClass.libelle || matchedClass.label || '—';
      }

      return rawClasse;
    }

    return student?.classeNom || student?.classeName || student?.className || student?.classeId || '—';
  };

  const financeRows = useMemo(() => {
    return paymentRows.map((payment) => {
      const student = studentRows.find((item) => String(item.id) === String(payment.etudiantId));

      return {
        ...payment,
        nom: student?.nom || '—',
        prenom: student?.prenom || '—',
        email: student?.email || '—',
        role: student?.role || 'ETUDIANT',
        classe: getStudentClassLabel(student, classRows),
        dateCreation: student?.dateCreation || student?.createdAt || '—',
      };
    });
  }, [paymentRows, studentRows, classRows]);

  const statCards = useMemo(() => {
    if (role === 'ROLE_DIRECTEUR') {
      return [
        { label: 'Total étudiants', value: dashboard.totalEtudiants ?? studentRows.length, icon: 'bi-people-fill', tone: 'positive' },
        { label: 'Vue du chiffre d’affaires', value: formatCurrency(dashboard.totalEncaissementPercu ?? 0), icon: 'bi-currency-dollar', tone: 'positive' },
        { label: 'Effectif du personnel', value: teacherRows.length, icon: 'bi-person-badge-fill', tone: 'primary' },
        { label: 'Alertes système', value: absenceRows.length, icon: 'bi-exclamation-triangle-fill', tone: 'warning' },
      ];
    }

    if (role === 'ROLE_RESPONSABLE_FINANCIER') {
      return [
        { label: 'Frais impayés', value: dashboard.totalImpayes ?? 0, icon: 'bi-cash-stack', tone: 'warning' },
        { label: 'Encaissement', value: formatCurrency(dashboard.totalEncaissementPercu ?? 0), icon: 'bi-receipt', tone: 'positive' },
        { label: 'Étudiants en retard', value: dashboard.nombreEtudiantsEnRetard ?? 0, icon: 'bi-clock-history', tone: 'danger' },
        { label: 'Paiements', value: paymentRows.length, icon: 'bi-credit-card', tone: 'primary' },
      ];
    }

    if (role === 'ROLE_SURVEILLANT') {
      return [
        { label: 'Absences cumulées', value: dashboard.totalAbsences ?? absenceRows.length, icon: 'bi-calendar-x-fill', tone: 'danger' },
        { label: 'Heures perdues', value: dashboard.totalHeuresAbsences ?? 0, icon: 'bi-clock-fill', tone: 'warning' },
        { label: 'Sanctions', value: dashboard.totalSanctions ?? 0, icon: 'bi-shield-exclamation', tone: 'primary' },
        { label: 'Étudiants', value: studentRows.length, icon: 'bi-people-fill', tone: 'positive' },
      ];
    }

    if (role === 'ROLE_PROFESSEUR') {
      return [
        { label: 'Classes assignées', value: classAssignments.length, icon: 'bi-mortarboard-fill', tone: 'primary' },
        { label: 'Groupes d’étudiants', value: studentAssignments.length, icon: 'bi-people-fill', tone: 'positive' },
        { label: 'Éléments du planning', value: timeTableRows.length, icon: 'bi-calendar3', tone: 'warning' },
        { label: 'Notes saisies', value: noteRows.length, icon: 'bi-journal-check', tone: 'positive' },
      ];
    }

    return [
      { label: 'Moyenne générale', value: '—', icon: 'bi-graph-up-arrow', tone: 'positive' },
      { label: 'Moyennes par matière', value: subjectRows.length, icon: 'bi-book-half', tone: 'primary' },
      { label: 'Absences', value: absenceRows.length, icon: 'bi-calendar-x-fill', tone: 'danger' },
      { label: 'Emploi du temps', value: timeTableRows.length, icon: 'bi-calendar3', tone: 'warning' },
    ];
  }, [absenceRows.length, classAssignments.length, dashboard, role, paymentRows.length, studentAssignments.length, studentRows.length, subjectRows.length, teacherRows.length, timeTableRows.length, noteRows.length]);

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();
    try {
      await addPaiement({
        ...paymentForm,
        montant: Number(paymentForm.montant),
        etudiantId: Number(paymentForm.etudiantId),
        responsableFinancierId: Number(paymentForm.responsableFinancierId),
      });
      setMessage('Payment created successfully.');
      setPaymentForm(initialPaymentForm);
      const { data: paiements } = await getAllPaiements();
      setPaymentRows(Array.isArray(paiements) ? paiements : []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to create payment.');
    }
  };

  const handleReceiptSubmit = async (event) => {
    event.preventDefault();
    try {
      await addRecu({
        ...receiptForm,
        montantPaye: Number(receiptForm.montantPaye),
        paiementId: Number(receiptForm.paiementId),
      });
      setMessage('Receipt created successfully.');
      setReceiptForm(initialReceiptForm);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to create receipt.');
    }
  };

  const handleSanctionSubmit = async (event) => {
    event.preventDefault();
    try {
      await addSanction({
        ...sanctionForm,
        etudiantId: Number(sanctionForm.etudiantId),
        totalAbsencesAuMoment: sanctionForm.totalAbsencesAuMoment ? Number(sanctionForm.totalAbsencesAuMoment) : 0,
      });
      setMessage('Sanction saved successfully.');
      setSanctionForm(initialSanctionForm);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to create sanction.');
    }
  };

  const handleNoteSubmit = async (event) => {
    event.preventDefault();
    try {
      await addNote({
        ...noteForm,
        etudiantId: Number(noteForm.etudiantId),
        evaluationId: Number(noteForm.evaluationId),
        valeur: Number(noteForm.valeur),
        professeurId: Number(userProfile?.id),
      });
      setMessage('Grade submitted successfully.');
      setNoteForm(initialNoteForm);
      const { data: notes } = await getMesNotes();
      setNoteRows(Array.isArray(notes) ? notes : []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to submit grade.');
    }
  };

  const downloadBulletin = async () => {
    try {
      const response = await axiosClient.get(`/api-bulletin/pdf/${userProfile?.id}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bulletin-${userProfile?.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMessage('Unable to download bulletin.');
    }
  };

  if (loading) {
    return <div className="app-card rounded-card p-4 text-center">Loading dashboard...</div>;
  }

  return (
    <>
      <header className="page-header">
        <div className="page-title-row">
          <h1>
            {role === 'ROLE_DIRECTEUR' && 'Tableau de bord directeur'}
            {role === 'ROLE_RESPONSABLE_FINANCIER' && 'Tableau de bord financier'}
            {role === 'ROLE_SURVEILLANT' && 'Tableau de bord de discipline'}
            {role === 'ROLE_PROFESSEUR' && 'Tableau de bord enseignant'}
            {role === 'ROLE_ETUDIANT' && 'Tableau de bord étudiant'}
          </h1>
        </div>
        <p className="page-subtitle">Vue personnalisée du ERP ECOSCOL selon les permissions de votre rôle.</p>
      </header>

      {message && (
        <div className="alert alert-success mb-4" role="alert">
          {message}
        </div>
      )}

      <section className="stats-grid mb-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="app-card stat-card rounded-card">
            <div className="stat-icon">
              <i className={`bi ${stat.icon}`} />
            </div>
            <span className="stat-label">{stat.label}</span>
            <span className="stat-value">{stat.value}</span>
          </div>
        ))}
      </section>

      {role === 'ROLE_DIRECTEUR' && (
        <section className="card-grid dashboard-director-cards">
          <div className="app-card rounded-card dashboard-director-card">
            <div className="card-header dashboard-card-header">
              <div>
                <h3>Flux d’activité système</h3>
                <small className="dashboard-card-subtitle">Opérations en direct sur le campus</small>
              </div>
              <span className="dashboard-timeline-pill">Mise à jour</span>
            </div>
            <ul className="dashboard-activity-list">
              <li className="dashboard-activity-item">
                <div className="dashboard-activity-icon blue">
                  <i className="bi bi-people-fill" />
                </div>
                <div className="dashboard-activity-copy">
                  <strong>{studentRows.length} étudiants inscrits</strong>
                  <small>Dernier total en direct des étudiants</small>
                </div>
                <span className="dashboard-activity-badge positive">En ligne</span>
              </li>
              <li className="dashboard-activity-item">
                <div className="dashboard-activity-icon purple">
                  <i className="bi bi-person-badge-fill" />
                </div>
                <div className="dashboard-activity-copy">
                  <strong>{teacherRows.length} membres du personnel actifs</strong>
                  <small>Effectif académique et administratif</small>
                </div>
                <span className="dashboard-activity-badge neutral">Stable</span>
              </li>
              <li className="dashboard-activity-item">
                <div className="dashboard-activity-icon green">
                  <i className="bi bi-credit-card" />
                </div>
                <div className="dashboard-activity-copy">
                  <strong>{paymentRows.length} enregistrements de paiement</strong>
                  <small>Activité financière observée dans le système</small>
                </div>
                <span className="dashboard-activity-badge info">Suivi</span>
              </li>
            </ul>
          </div>

          <div className="app-card rounded-card dashboard-director-card">
            <div className="card-header dashboard-card-header">
              <div>
                <h3>Vue générale de l’école</h3>
                <small className="dashboard-card-subtitle">Indicateurs clés en un coup d’œil</small>
              </div>
              <span className="dashboard-timeline-pill alt">Ce trimestre</span>
            </div>

            <div className="dashboard-overview-grid">
              <div className="dashboard-overview-item">
                <span className="dashboard-overview-label">Classes totales</span>
                <strong>{dashboard.totalClasses ?? classRows.length}</strong>
                <small>Groupes de classe actifs</small>
              </div>
              <div className="dashboard-overview-item">
                <span className="dashboard-overview-label">Matières totales</span>
                <strong>{dashboard.totalMatieres ?? subjectRows.length}</strong>
                <small>Couverture pédagogique</small>
              </div>
              <div className="dashboard-overview-item">
                <span className="dashboard-overview-label">Moyenne générale</span>
                <strong>{dashboard.moyenneEtablissement ?? '—'}</strong>
                <small>Performance globale de l’établissement</small>
              </div>
              <div className="dashboard-overview-item">
                <span className="dashboard-overview-label">Paiements en attente</span>
                <strong>{formatCurrency(dashboard.totalImpayes ?? 0)}</strong>
                <small>Suivi financier requis</small>
              </div>
            </div>

            <div className="dashboard-overview-footer">
              <div className="dashboard-mini-stat">
                <span>Inscriptions</span>
                <strong>{studentRows.length}</strong>
              </div>
              <div className="dashboard-mini-stat">
                <span>Personnel</span>
                <strong>{teacherRows.length}</strong>
              </div>
              <div className="dashboard-mini-stat highlight">
                <span>Finance</span>
                <strong>{formatCurrency(dashboard.totalImpayes ?? 0)}</strong>
              </div>
            </div>
          </div>
        </section>
      )}

      {role === 'ROLE_RESPONSABLE_FINANCIER' && (
        <section className="card-grid">
          <div className="app-card rounded-card table-card">
            <div className="card-header">
              <h3>Suivi des frais impayés</h3>
            </div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Email</th>
                    <th>Classe</th>
                    <th>Rôle</th>
                    <th>Date création</th>
                    <th>Statut</th>
                    <th>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {financeRows.filter((payment) => payment.statut === 'EN_RETARD' || payment.statut === 'PARTIEL').map((payment) => (
                    <tr key={payment.id ?? payment.referencePaiement}>
                      <td>{payment.nom}</td>
                      <td>{payment.prenom}</td>
                      <td>{payment.email}</td>
                      <td>{payment.classe}</td>
                      <td>{payment.role}</td>
                      <td>{formatDate(payment.dateCreation)}</td>
                      <td><span className="badge-soft warning">{payment.statut}</span></td>
                      <td>{formatCurrency(payment.montant ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </section>
      )}

      {role === 'ROLE_SURVEILLANT' && (
        <section className="card-grid">
          <div className="app-card rounded-card table-card">
            <div className="card-header">
              <h3>Absences cumulées</h3>
            </div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Étudiant</th>
                    <th>Heures</th>
                    <th>Alerte</th>
                  </tr>
                </thead>
                <tbody>
                  {absenceRows.map((absence) => {
                    const totalAbsences = Number(absence.totalAbsencesAuMoment ?? 0);
                    const alertType = totalAbsences > 30 ? 'CONSEIL_DISCIPLINE' : totalAbsences > 20 ? 'CONVOCATION_PARENTS' : 'Normal';
                    return (
                      <tr key={absence.id ?? absence.etudiantId}>
                        <td>{absence.etudiantId ?? '—'}</td>
                        <td>{totalAbsences}</td>
                        <td>
                          <span className={`badge-soft ${alertType !== 'Normal' ? 'warning' : 'success'}`}>
                            {alertType}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="app-card rounded-card p-3">
            <div className="card-header">
              <h3>Saisie rapide de sanction</h3>
            </div>
            <form onSubmit={handleSanctionSubmit}>
              <div className="row g-2">
                <div className="col-md-4">
                  <label className="form-label">ID étudiant</label>
                  <input className="form-control" type="number" value={sanctionForm.etudiantId} onChange={(e) => setSanctionForm({ ...sanctionForm, etudiantId: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={sanctionForm.type} onChange={(e) => setSanctionForm({ ...sanctionForm, type: e.target.value })}>
                    <option value="CONVOCATION_PARENTS">Convocation parents</option>
                    <option value="CONSEIL_DISCIPLINE">Conseil de discipline</option>
                    <option value="AVERTISSEMENT">Avertissement</option>
                    <option value="EXCLUSION">Exclusion</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Heures d’absence</label>
                  <input className="form-control" type="number" value={sanctionForm.totalAbsencesAuMoment} onChange={(e) => setSanctionForm({ ...sanctionForm, totalAbsencesAuMoment: e.target.value })} />
                </div>
                <div className="col-md-12">
                  <label className="form-label">Motif</label>
                  <textarea className="form-control" rows={3} value={sanctionForm.motif} onChange={(e) => setSanctionForm({ ...sanctionForm, motif: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Date</label>
                  <input className="form-control" type="date" value={sanctionForm.dateEmission} onChange={(e) => setSanctionForm({ ...sanctionForm, dateEmission: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-primary mt-3" type="submit">Enregistrer la sanction</button>
            </form>
          </div>
        </section>
      )}

      {role === 'ROLE_PROFESSEUR' && (
        <section className="card-grid">
          <div className="app-card rounded-card table-card">
            <div className="card-header">
              <h3>Classes assignées</h3>
            </div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Classe</th>
                    <th>Matière</th>
                  </tr>
                </thead>
                <tbody>
                  {classAssignments.map((item) => (
                    <tr key={item.id ?? item.nom}>
                      <td>{item.nom || item.classeNom || '—'}</td>
                      <td>{item.specialite || item.matiere || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="app-card rounded-card p-3">
            <div className="card-header">
              <h3>Planning de cours du jour</h3>
            </div>
            <ul className="activity-list list-unstyled">
              {timeTableRows.map((schedule) => (
                <li key={schedule.id ?? schedule.libelle} className="activity-item">
                  <div>
                    <strong>{schedule.libelle || schedule.matiere || 'Session'}</strong>
                    <small>{schedule.date || schedule.horaire || '—'}</small>
                  </div>
                  <i className="bi bi-calendar3 text-primary" />
                </li>
              ))}
            </ul>
          </div>

          <div className="app-card rounded-card p-3">
            <div className="card-header">
              <h3>Saisie rapide des notes</h3>
            </div>
            <form onSubmit={handleNoteSubmit}>
              <div className="row g-2">
                <div className="col-md-4">
                  <label className="form-label">ID étudiant</label>
                  <input className="form-control" type="number" value={noteForm.etudiantId} onChange={(e) => setNoteForm({ ...noteForm, etudiantId: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">ID évaluation</label>
                  <input className="form-control" type="number" value={noteForm.evaluationId} onChange={(e) => setNoteForm({ ...noteForm, evaluationId: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Valeur</label>
                  <input className="form-control" type="number" step="0.01" value={noteForm.valeur} onChange={(e) => setNoteForm({ ...noteForm, valeur: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Date</label>
                  <input className="form-control" type="date" value={noteForm.dateSaisie} onChange={(e) => setNoteForm({ ...noteForm, dateSaisie: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Appréciation</label>
                  <input className="form-control" value={noteForm.appreciation} onChange={(e) => setNoteForm({ ...noteForm, appreciation: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-primary mt-3" type="submit">Soumettre la note</button>
            </form>
          </div>
        </section>
      )}

      {role === 'ROLE_ETUDIANT' && (
        <section className="card-grid">
          <div className="app-card rounded-card table-card">
            <div className="card-header">
              <h3>Moyenne générale et moyennes par matière</h3>
            </div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Matière</th>
                    <th>Moyenne</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectRows.map((subject) => (
                    <tr key={subject.id ?? subject.nom}>
                      <td>{subject.nom || subject.intitule || '—'}</td>
                      <td>{'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="app-card rounded-card p-3">
            <div className="card-header">
              <h3>Emploi du temps personnel</h3>
            </div>
            <ul className="activity-list list-unstyled">
              {timeTableRows.map((session) => (
                <li key={session.id ?? session.libelle} className="activity-item">
                  <div>
                    <strong>{session.libelle || session.matiere || 'Session'}</strong>
                    <small>{session.date || session.horaire || '—'}</small>
                  </div>
                  <i className="bi bi-calendar3 text-primary" />
                </li>
              ))}
            </ul>
          </div>

          <div className="app-card rounded-card p-3">
            <div className="card-header">
              <h3>Absences cumulées</h3>
              <button type="button" className="btn btn-link text-primary px-0" onClick={downloadBulletin}>Télécharger le bulletin PDF</button>
            </div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Motif</th>
                    <th>Justifiée</th>
                  </tr>
                </thead>
                <tbody>
                  {absenceRows.map((absence) => (
                    <tr key={absence.id ?? `${absence.date}-${absence.motif}`}>
                      <td>{formatDate(absence.date || absence.dateAbsence)}</td>
                      <td>{absence.motif || '—'}</td>
                      <td>
                        <span className={`badge-soft ${absence.justifiee ? 'success' : 'danger'}`}>
                          {absence.justifiee ? 'Oui' : 'Non'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default Dashboard;
