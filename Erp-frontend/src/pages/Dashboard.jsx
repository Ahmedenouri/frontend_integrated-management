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
  const [message, setMessage] = useState('');
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
          const [{ data: financierData }, { data: paiements }, { data: students }] = await Promise.all([
            getDashboardFinancier(),
            getAllPaiements(),
            getAllStudents(),
          ]);

          setDashboard(financierData || {});
          setPaymentRows(Array.isArray(paiements) ? paiements : []);
          setStudentRows(Array.isArray(students) ? students : []);
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

  const statCards = useMemo(() => {
    if (role === 'ROLE_DIRECTEUR') {
      return [
        { label: 'Total students', value: dashboard.totalEtudiants ?? studentRows.length, icon: 'bi-people-fill', tone: 'positive' },
        { label: 'Revenue overview', value: formatCurrency(dashboard.totalEncaissementPercu ?? 0), icon: 'bi-currency-dollar', tone: 'positive' },
        { label: 'Staff count', value: teacherRows.length, icon: 'bi-person-badge-fill', tone: 'primary' },
        { label: 'System alerts', value: absenceRows.length, icon: 'bi-exclamation-triangle-fill', tone: 'warning' },
      ];
    }

    if (role === 'ROLE_RESPONSABLE_FINANCIER') {
      return [
        { label: 'Unpaid fees', value: dashboard.totalImpayes ?? 0, icon: 'bi-cash-stack', tone: 'warning' },
        { label: 'Collected', value: formatCurrency(dashboard.totalEncaissementPercu ?? 0), icon: 'bi-receipt', tone: 'positive' },
        { label: 'Late students', value: dashboard.nombreEtudiantsEnRetard ?? 0, icon: 'bi-clock-history', tone: 'danger' },
        { label: 'Payments', value: paymentRows.length, icon: 'bi-credit-card', tone: 'primary' },
      ];
    }

    if (role === 'ROLE_SURVEILLANT') {
      return [
        { label: 'Cumulative absences', value: dashboard.totalAbsences ?? absenceRows.length, icon: 'bi-calendar-x-fill', tone: 'danger' },
        { label: 'Hours lost', value: dashboard.totalHeuresAbsences ?? 0, icon: 'bi-clock-fill', tone: 'warning' },
        { label: 'Sanctions', value: dashboard.totalSanctions ?? 0, icon: 'bi-shield-exclamation', tone: 'primary' },
        { label: 'Students', value: studentRows.length, icon: 'bi-people-fill', tone: 'positive' },
      ];
    }

    if (role === 'ROLE_PROFESSEUR') {
      return [
        { label: 'Assigned classes', value: classAssignments.length, icon: 'bi-mortarboard-fill', tone: 'primary' },
        { label: 'Student groups', value: studentAssignments.length, icon: 'bi-people-fill', tone: 'positive' },
        { label: 'Schedule items', value: timeTableRows.length, icon: 'bi-calendar3', tone: 'warning' },
        { label: 'Grades entered', value: noteRows.length, icon: 'bi-journal-check', tone: 'positive' },
      ];
    }

    return [
      { label: 'Current GPA', value: '—', icon: 'bi-graph-up-arrow', tone: 'positive' },
      { label: 'Subject averages', value: subjectRows.length, icon: 'bi-book-half', tone: 'primary' },
      { label: 'Absences', value: absenceRows.length, icon: 'bi-calendar-x-fill', tone: 'danger' },
      { label: 'Timetable', value: timeTableRows.length, icon: 'bi-calendar3', tone: 'warning' },
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
            {role === 'ROLE_DIRECTEUR' && 'Director dashboard'}
            {role === 'ROLE_RESPONSABLE_FINANCIER' && 'Finance dashboard'}
            {role === 'ROLE_SURVEILLANT' && 'Discipline dashboard'}
            {role === 'ROLE_PROFESSEUR' && 'Teaching dashboard'}
            {role === 'ROLE_ETUDIANT' && 'Student dashboard'}
          </h1>
        </div>
        <p className="page-subtitle">Personalized ECOSCOL ERP overview based on your role permissions.</p>
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
        <section className="card-grid director-overview-grid">
          <div className="app-card rounded-card insights-card">
            <div className="card-header card-header-split">
              <div>
                <h3>System activity stream</h3>
                <small className="card-subtitle">Live operations across the campus</small>
              </div>
              <span className="timeline-pill">Updated now</span>
            </div>
            <ul className="activity-list list-unstyled">
              <li className="activity-item modern-item">
                <div className="activity-icon blue">
                  <i className="bi bi-people-fill" />
                </div>
                <div className="activity-copy">
                  <strong>{studentRows.length} students registered</strong>
                  <small>Latest live student count</small>
                </div>
                <span className="activity-badge positive">Live</span>
              </li>
              <li className="activity-item modern-item">
                <div className="activity-icon purple">
                  <i className="bi bi-person-badge-fill" />
                </div>
                <div className="activity-copy">
                  <strong>{teacherRows.length} staff members active</strong>
                  <small>Academic and administrative workforce</small>
                </div>
                <span className="activity-badge neutral">Stable</span>
              </li>
              <li className="activity-item modern-item">
                <div className="activity-icon green">
                  <i className="bi bi-credit-card" />
                </div>
                <div className="activity-copy">
                  <strong>{paymentRows.length} payment records</strong>
                  <small>Finance activity observed in the system</small>
                </div>
                <span className="activity-badge info">Tracked</span>
              </li>
            </ul>
          </div>

          <div className="app-card rounded-card insights-card">
            <div className="card-header card-header-split">
              <div>
                <h3>School overview</h3>
                <small className="card-subtitle">Key indicators at a glance</small>
              </div>
              <span className="timeline-pill alt">This term</span>
            </div>

            <div className="overview-grid">
              <div className="overview-item">
                <span className="overview-label">Total classes</span>
                <strong>{dashboard.totalClasses ?? classRows.length}</strong>
                <small>Active classroom groups</small>
              </div>
              <div className="overview-item">
                <span className="overview-label">Total subjects</span>
                <strong>{dashboard.totalMatieres ?? subjectRows.length}</strong>
                <small>Curriculum coverage</small>
              </div>
              <div className="overview-item">
                <span className="overview-label">Average score</span>
                <strong>{dashboard.moyenneEtablissement ?? '—'}</strong>
                <small>Institution-wide performance</small>
              </div>
              <div className="overview-item">
                <span className="overview-label">Outstanding payments</span>
                <strong>{formatCurrency(dashboard.totalImpayes ?? 0)}</strong>
                <small>Finance follow-up required</small>
              </div>
            </div>

            <div className="overview-footer">
              <div className="mini-stat">
                <span>Enrollment</span>
                <strong>{studentRows.length}</strong>
              </div>
              <div className="mini-stat">
                <span>Staff</span>
                <strong>{teacherRows.length}</strong>
              </div>
              <div className="mini-stat highlight">
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
              <h3>Unpaid fees tracker</h3>
            </div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentRows.filter((payment) => payment.statut === 'EN_RETARD' || payment.statut === 'PARTIEL').map((payment) => (
                    <tr key={payment.id ?? payment.referencePaiement}>
                      <td>{payment.etudiantId ?? '—'}</td>
                      <td><span className="badge-soft warning">{payment.statut}</span></td>
                      <td>{formatCurrency(payment.montant ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="app-card rounded-card p-3">
            <div className="card-header">
              <h3>Quick actions</h3>
            </div>

            <form onSubmit={handlePaymentSubmit} className="mb-4">
              <div className="row g-2">
                <div className="col-md-6">
                  <label className="form-label">Reference</label>
                  <input className="form-control" value={paymentForm.referencePaiement} onChange={(e) => setPaymentForm({ ...paymentForm, referencePaiement: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Student ID</label>
                  <input className="form-control" type="number" value={paymentForm.etudiantId} onChange={(e) => setPaymentForm({ ...paymentForm, etudiantId: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={paymentForm.typePaiement} onChange={(e) => setPaymentForm({ ...paymentForm, typePaiement: e.target.value })}>
                    <option value="MENSUALITE">Mensualité</option>
                    <option value="FRAIS_SCOLARITE">Frais scolaire</option>
                    <option value="FRAIS_INSCRIPTION">Frais inscription</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Mode</label>
                  <select className="form-select" value={paymentForm.mode} onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })}>
                    <option value="VIREMENT">Virement</option>
                    <option value="ESPECES">Espèces</option>
                    <option value="CARTE_BANCAIRE">Carte bancaire</option>
                    <option value="CHEQUE">Chèque</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={paymentForm.statut} onChange={(e) => setPaymentForm({ ...paymentForm, statut: e.target.value })}>
                    <option value="PAYE">Payé</option>
                    <option value="PARTIEL">Partiel</option>
                    <option value="EN_RETARD">En retard</option>
                    <option value="EN_ATTENTE">En attente</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Amount</label>
                  <input className="form-control" type="number" step="0.01" value={paymentForm.montant} onChange={(e) => setPaymentForm({ ...paymentForm, montant: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Date</label>
                  <input className="form-control" type="date" value={paymentForm.datePaiement} onChange={(e) => setPaymentForm({ ...paymentForm, datePaiement: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-primary mt-3" type="submit">Add payment</button>
            </form>

            <form onSubmit={handleReceiptSubmit}>
              <div className="row g-2">
                <div className="col-md-4">
                  <label className="form-label">Receipt number</label>
                  <input className="form-control" value={receiptForm.numeroRecu} onChange={(e) => setReceiptForm({ ...receiptForm, numeroRecu: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Payment ID</label>
                  <input className="form-control" type="number" value={receiptForm.paiementId} onChange={(e) => setReceiptForm({ ...receiptForm, paiementId: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Date</label>
                  <input className="form-control" type="date" value={receiptForm.dateEmission} onChange={(e) => setReceiptForm({ ...receiptForm, dateEmission: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Amount paid</label>
                  <input className="form-control" type="number" step="0.01" value={receiptForm.montantPaye} onChange={(e) => setReceiptForm({ ...receiptForm, montantPaye: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-primary mt-3" type="submit">Add receipt</button>
            </form>
          </div>
        </section>
      )}

      {role === 'ROLE_SURVEILLANT' && (
        <section className="card-grid">
          <div className="app-card rounded-card table-card">
            <div className="card-header">
              <h3>Cumulative absences</h3>
            </div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Hours</th>
                    <th>Alert</th>
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
              <h3>Quick sanction entry</h3>
            </div>
            <form onSubmit={handleSanctionSubmit}>
              <div className="row g-2">
                <div className="col-md-4">
                  <label className="form-label">Student ID</label>
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
                  <label className="form-label">Absence hours</label>
                  <input className="form-control" type="number" value={sanctionForm.totalAbsencesAuMoment} onChange={(e) => setSanctionForm({ ...sanctionForm, totalAbsencesAuMoment: e.target.value })} />
                </div>
                <div className="col-md-12">
                  <label className="form-label">Reason</label>
                  <textarea className="form-control" rows={3} value={sanctionForm.motif} onChange={(e) => setSanctionForm({ ...sanctionForm, motif: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Date</label>
                  <input className="form-control" type="date" value={sanctionForm.dateEmission} onChange={(e) => setSanctionForm({ ...sanctionForm, dateEmission: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-primary mt-3" type="submit">Save sanction</button>
            </form>
          </div>
        </section>
      )}

      {role === 'ROLE_PROFESSEUR' && (
        <section className="card-grid">
          <div className="app-card rounded-card table-card">
            <div className="card-header">
              <h3>Assigned classes</h3>
            </div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Subject</th>
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
              <h3>Today's teaching schedule</h3>
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
              <h3>Quick grade entry</h3>
            </div>
            <form onSubmit={handleNoteSubmit}>
              <div className="row g-2">
                <div className="col-md-4">
                  <label className="form-label">Student ID</label>
                  <input className="form-control" type="number" value={noteForm.etudiantId} onChange={(e) => setNoteForm({ ...noteForm, etudiantId: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Evaluation ID</label>
                  <input className="form-control" type="number" value={noteForm.evaluationId} onChange={(e) => setNoteForm({ ...noteForm, evaluationId: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Value</label>
                  <input className="form-control" type="number" step="0.01" value={noteForm.valeur} onChange={(e) => setNoteForm({ ...noteForm, valeur: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Date</label>
                  <input className="form-control" type="date" value={noteForm.dateSaisie} onChange={(e) => setNoteForm({ ...noteForm, dateSaisie: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Appreciation</label>
                  <input className="form-control" value={noteForm.appreciation} onChange={(e) => setNoteForm({ ...noteForm, appreciation: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-primary mt-3" type="submit">Submit grade</button>
            </form>
          </div>
        </section>
      )}

      {role === 'ROLE_ETUDIANT' && (
        <section className="card-grid">
          <div className="app-card rounded-card table-card">
            <div className="card-header">
              <h3>Personal GPA & subject averages</h3>
            </div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Average</th>
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
              <h3>Personal timetable</h3>
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
              <h3>Cumulative absences</h3>
              <button type="button" className="btn btn-link text-primary px-0" onClick={downloadBulletin}>Download bulletin PDF</button>
            </div>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reason</th>
                    <th>Justified</th>
                  </tr>
                </thead>
                <tbody>
                  {absenceRows.map((absence) => (
                    <tr key={absence.id ?? `${absence.date}-${absence.motif}`}>
                      <td>{formatDate(absence.date || absence.dateAbsence)}</td>
                      <td>{absence.motif || '—'}</td>
                      <td>
                        <span className={`badge-soft ${absence.justifiee ? 'success' : 'danger'}`}>
                          {absence.justifiee ? 'Yes' : 'No'}
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
