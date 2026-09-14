import { useEffect, useMemo, useState } from 'react';
import axiosClient from '../api/axiosClient';
import {
  addPaiement,
  createStudent,
  deletePaiement,
  getAllClasses,
  getAllFinancialManagers,
  getAllPaiements,
  getAllStudents,
  getDashboardFinancier,
  updatePaiement,
} from '../api/erpApi';
import DataTable from '../components/DataTable';
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

const initialStudentForm = {
  nom: '',
  prenom: '',
  email: '',
  motDePasse: '',
  telephone: '',
  classeId: '',
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

const getStudentClassId = (student) => {
  if (student?.classeId !== undefined && student?.classeId !== null) return student.classeId;
  if (typeof student?.classe === 'object') return student.classe?.id;
  return student?.classe;
};

const getStudentLevel = (student, classes = []) => (
  student?.niveau
  || student?.niveauEtude
  || classes.find((item) => String(item.id) === String(getStudentClassId(student)))?.niveau
  || ''
);

const generateUniquePaymentReference = (existingPaiements = []) => {
  const usedReferences = new Set(
    existingPaiements
      .map((paiement) => paiement.referencePaiement)
      .filter(Boolean)
  );

  let reference = '';

  do {
    reference = `PAY-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;
  } while (usedReferences.has(reference));

  return reference;
};

const FinancePage = () => {
  const { userProfile, userRole } = useAuth();
  const [stats, setStats] = useState(null);
  const [paiements, setPaiements] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [financialManagers, setFinancialManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [paymentClassId, setPaymentClassId] = useState('');
  const [paymentLevel, setPaymentLevel] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [editingPaiement, setEditingPaiement] = useState(null);
  const [pendingDeletePaiement, setPendingDeletePaiement] = useState(null);
  const [selectedPaiement, setSelectedPaiement] = useState(null);
  const [receiptPaiement, setReceiptPaiement] = useState(null);
  const [receiptPdfUrl, setReceiptPdfUrl] = useState('');
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [formData, setFormData] = useState(initialPaymentForm);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);
  const [studentForm, setStudentForm] = useState(initialStudentForm);
  const [studentSaving, setStudentSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useGlobalMessage('error');

  const paymentClassStudents = students.filter((student) => String(getStudentClassId(student)) === String(paymentClassId));
  const paymentLevels = [...new Set(paymentClassStudents.map((student) => getStudentLevel(student, classes)).filter(Boolean))];
  const paymentStudents = paymentClassStudents.filter((student) => !paymentLevel || getStudentLevel(student, classes) === paymentLevel);

  const openStudentForm = () => {
    setStudentForm(initialStudentForm);
    setErrorMessage('');
    setIsStudentFormOpen(true);
  };

  const closeStudentForm = () => {
    setIsStudentFormOpen(false);
    setStudentForm(initialStudentForm);
  };

  const handleStudentSubmit = async (event) => {
    event.preventDefault();
    setStudentSaving(true);
    setErrorMessage('');

    try {
      if (!studentForm.nom.trim() || !studentForm.prenom.trim() || !studentForm.email.trim() || !studentForm.motDePasse) {
        throw new Error('Nom, prénom, email et mot de passe sont obligatoires.');
      }

      const { data } = await createStudent({
        ...studentForm,
        nom: studentForm.nom.trim(),
        prenom: studentForm.prenom.trim(),
        email: studentForm.email.trim(),
        role: 'ETUDIANT',
        estActif: true,
        classeId: studentForm.classeId ? Number(studentForm.classeId) : undefined,
      });
      const createdStudent = data || { ...studentForm, id: data?.id };
      setStudents((current) => [...current, createdStudent]);
      setFormData((current) => ({ ...current, etudiantId: String(createdStudent.id) }));
      setPaymentClassId(String(getStudentClassId(createdStudent) || studentForm.classeId || ''));
      setPaymentLevel(getStudentLevel(createdStudent, classes));
      closeStudentForm();
      setSuccessMessage('Étudiant ajouté. Vous pouvez maintenant enregistrer le paiement.');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || error.message || 'Impossible d’ajouter l’étudiant.');
    } finally {
      setStudentSaving(false);
    }
  };

  const loadFinance = async () => {
    try {
      const [{ data: financeData }, { data: paiementsData }, { data: studentsData }, { data: classesData }, financialManagersResult] = await Promise.all([
        getDashboardFinancier(),
        getAllPaiements(),
        getAllStudents(),
        getAllClasses(),
        getAllFinancialManagers().catch(() => ({ data: [] })),
      ]);

      const studentMap = new Map(
        Array.isArray(studentsData)
          ? studentsData.map((student) => [student.id, student])
          : []
      );

      const classList = Array.isArray(classesData) ? classesData : [];

      const enrichedPaiements = Array.isArray(paiementsData)
        ? paiementsData.map((paiement) => {
            const student = studentMap.get(paiement.etudiantId);

            return {
              ...paiement,
              nom: student?.nom || '—',
              prenom: student?.prenom || '—',
              email: student?.email || '—',
              role: student?.role || 'ETUDIANT',
              classe: getStudentClassLabel(student, classList),
              dateCreation: student?.dateCreation || student?.createdAt || '—',
            };
          })
        : [];

      setStats(financeData || {});
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setClasses(classList);
      setFinancialManagers(Array.isArray(financialManagersResult.data) ? financialManagersResult.data : []);
      setPaiements(enrichedPaiements);
    } catch (error) {
      console.error('Failed to load finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinance();
  }, []);

  useEffect(() => {
    if (userProfile?.id) {
      setFormData((currentForm) => ({
        ...currentForm,
        responsableFinancierId: String(userProfile.id),
      }));
    }
  }, [userProfile?.id]);

  const filteredPaiements = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return paiements;
    }

    return paiements.filter((paiement) => {
      const searchableValues = [
        paiement.nom,
        paiement.prenom,
        paiement.email,
        paiement.classe,
        paiement.role,
        paiement.referencePaiement,
        paiement.typePaiement,
        paiement.statut,
      ];

      return searchableValues.some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch));
    });
  }, [paiements, searchTerm]);

  const paymentStatusCounts = useMemo(() => ({
    enRetard: paiements.filter((paiement) => paiement.statut === 'EN_RETARD').length,
    partiel: paiements.filter((paiement) => paiement.statut === 'PARTIEL').length,
    enAttente: paiements.filter((paiement) => paiement.statut === 'EN_ATTENTE').length,
  }), [paiements]);

  const selectedClass = classes.find((classItem) => String(classItem.id) === String(selectedClassId));
  const classStudents = students.filter((student) => String(getStudentClassId(student)) === String(selectedClassId));
  const levels = [...new Set(classStudents.map((student) => student.niveau || student.niveauEtude || selectedClass?.niveau).filter(Boolean))];
  const filteredStudents = students.filter((student) => {
    const studentClassId = getStudentClassId(student);
    const studentLevel = student.niveau || student.niveauEtude || classes.find((item) => String(item.id) === String(studentClassId))?.niveau;
    return (!selectedClassId || String(studentClassId) === String(selectedClassId))
      && (!selectedLevel || studentLevel === selectedLevel)
      && (!selectedStudentId || String(student.id) === String(selectedStudentId));
  });
  const paymentByStudent = new Map();
  paiements.forEach((paiement) => {
    const key = String(paiement.etudiantId);
    paymentByStudent.set(key, [...(paymentByStudent.get(key) || []), paiement]);
  });
  const studentFinanceRows = filteredStudents.map((student) => {
    const studentPayments = paymentByStudent.get(String(student.id)) || [];
    const paid = studentPayments.some((paiement) => paiement.statut === 'PAYE');
    const status = !studentPayments.length ? 'NON_INSCRIT' : paid ? 'PAYE' : 'IMPAYE';
    return { ...student, studentPayments, status };
  });

  const openCreateModal = () => {
    setEditingPaiement(null);
    setErrorMessage('');
    setFormData({
      ...initialPaymentForm,
      referencePaiement: generateUniquePaymentReference(paiements),
      responsableFinancierId: userProfile?.id ? String(userProfile.id) : '',
    });
    setPaymentConfirmed(false);
    setPaymentClassId('');
    setPaymentLevel('');
    setIsFormModalOpen(true);
  };

  const openEditModal = (paiement) => {
    setEditingPaiement(paiement);
    setErrorMessage('');
    setFormData({
      referencePaiement: paiement.referencePaiement || '',
      typePaiement: paiement.typePaiement || 'MENSUALITE',
      montant: paiement.montant ?? '',
      datePaiement: paiement.datePaiement || '',
      mode: paiement.mode || 'VIREMENT',
      statut: paiement.statut || 'PAYE',
      etudiantId: paiement.etudiantId ? String(paiement.etudiantId) : '',
      responsableFinancierId: paiement.responsableFinancierId ? String(paiement.responsableFinancierId) : userProfile?.id ? String(userProfile.id) : '',
    });
    setPaymentConfirmed(true);
    const currentStudent = students.find((student) => String(student.id) === String(paiement.etudiantId));
    setPaymentClassId(String(getStudentClassId(currentStudent) || ''));
    setPaymentLevel(getStudentLevel(currentStudent, classes));
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setEditingPaiement(null);
    setErrorMessage('');
    setFormData({
      ...initialPaymentForm,
      responsableFinancierId: userProfile?.id ? String(userProfile.id) : '',
    });
    setPaymentClassId('');
    setPaymentLevel('');
    setPaymentConfirmed(false);
  };

  const openDeleteModal = (paiement) => {
    setPendingDeletePaiement(paiement);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setPendingDeletePaiement(null);
    setIsDeleteModalOpen(false);
  };

  const openDetailsModal = (paiement) => {
    setSelectedPaiement(paiement);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setSelectedPaiement(null);
    setIsDetailsModalOpen(false);
  };

  const closeReceiptModal = () => {
    if (receiptPdfUrl) {
      window.URL.revokeObjectURL(receiptPdfUrl);
    }

    setReceiptPdfUrl('');
    setReceiptPaiement(null);
    setIsReceiptModalOpen(false);
    setReceiptLoading(false);
  };

  const openReceiptModal = async (paiement) => {
    setReceiptPaiement(paiement);
    setIsReceiptModalOpen(true);
    setReceiptLoading(true);

    try {
      const response = await axiosClient.get(`/api-paiement/recu-pdf/${paiement.id}`, {
        responseType: 'blob',
      });

      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const pdfUrl = window.URL.createObjectURL(pdfBlob);

      if (receiptPdfUrl) {
        window.URL.revokeObjectURL(receiptPdfUrl);
      }

      setReceiptPdfUrl(pdfUrl);
    } catch (error) {
      console.error('Failed to load payment receipt PDF:', error);
      setReceiptPdfUrl('');
    } finally {
      setReceiptLoading(false);
    }
  };

  const downloadReceiptPdf = async (paiement) => {
    try {
      const response = await axiosClient.get(`/api-paiement/recu-pdf/${paiement.id}`, {
        responseType: 'blob',
      });

      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recu-${paiement.referencePaiement || paiement.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download payment receipt PDF:', error);
      setErrorMessage('Impossible de télécharger le reçu PDF.');
    }
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        ...formData,
        montant: Number(formData.montant),
        etudiantId: Number(formData.etudiantId),
        responsableFinancierId: formData.responsableFinancierId
          ? Number(formData.responsableFinancierId)
          : userProfile?.id
            ? Number(userProfile.id)
            : null,
      };

      if (editingPaiement) {
        await updatePaiement(editingPaiement.id, payload);
      } else {
        if (!formData.etudiantId) {
          throw new Error('Veuillez sélectionner un étudiant avant d’ajouter le paiement.');
        }

        if (!['ROLE_DIRECTEUR', 'ROLE_RESPONSABLE_FINANCIER'].includes(userRole) || !paymentConfirmed) {
          throw new Error('Confirmez que le paiement est validé par le Directeur ou le Responsable financier.');
        }

        await addPaiement(payload);
      }

      closeFormModal();
      await loadFinance();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Impossible d\'enregistrer ce paiement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeletePaiement) {
      return;
    }

    try {
      await deletePaiement(pendingDeletePaiement.id);
      closeDeleteModal();
      await loadFinance();
    } catch (error) {
      console.error('Failed to delete payment:', error);
      setErrorMessage(error.response?.data?.message || 'Impossible de supprimer ce paiement.');
      closeDeleteModal();
    }
  };

  const columns = [
    { key: 'id', label: 'ID reçu' },
    { key: 'referencePaiement', label: 'Référence' },
    { key: 'nom', label: 'Nom' },
    { key: 'prenom', label: 'Prénom' },
    { key: 'email', label: 'Email' },
    { key: 'classe', label: 'Classe' },
    { key: 'role', label: 'Rôle' },
    {
      key: 'dateCreation',
      label: 'Date création',
      render: (row) => formatDate(row.dateCreation),
    },
    {
      key: 'montant',
      label: 'Montant',
      render: (row) => formatCurrency(row.montant),
    },
    {
      key: 'datePaiement',
      label: 'Date paiement',
      render: (row) => formatDate(row.datePaiement),
    },
    {
      key: 'statut',
      label: 'Statut',
      render: (row) => (
        <span className={`badge-soft ${row.statut === 'PAYE' ? 'success' : 'warning'}`}>
          {row.statut || 'Inconnu'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-sm btn-outline-info" type="button" onClick={() => openDetailsModal(row)}>
            Voir
          </button>
          <button className="btn btn-sm btn-outline-success" type="button" onClick={() => openReceiptModal(row)}>
            Voir reçu
          </button>
          <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => openEditModal(row)}>
            Modifier
          </button>
          <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => openDeleteModal(row)}>
            Supprimer
          </button>
          <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => downloadReceiptPdf(row)}>
            Télécharger reçu
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <header className="page-header">
        <div className="page-title-row">
          <h1>Finance</h1>
        </div>
        <p className="page-subtitle">Liste des paiements et gestion financière des étudiants.</p>
      </header>

      <div className={isFormModalOpen || isDeleteModalOpen || isDetailsModalOpen ? 'page-shell page-blur' : 'page-shell'}>
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
              <div className="app-card stat-card rounded-card">
                <span className="stat-label">Paiements en retard</span>
                <span className="stat-value">{paymentStatusCounts.enRetard}</span>
              </div>
              <div className="app-card stat-card rounded-card">
                <span className="stat-label">Paiements partiels</span>
                <span className="stat-value">{paymentStatusCounts.partiel}</span>
              </div>
              <div className="app-card stat-card rounded-card">
                <span className="stat-label">Paiements en attente</span>
                <span className="stat-value">{paymentStatusCounts.enAttente}</span>
              </div>
            </section>

            <section className="app-card rounded-card p-3 mb-4">
              <div className="card-header mb-3">
                <div>
                  <h3>Situation financière des étudiants</h3>
                  <p className="text-muted mb-0">Filtrez par classe, niveau puis étudiant pour voir les paiements.</p>
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <label className="form-label">Classe</label>
                  <select
                    className="form-select"
                    value={selectedClassId}
                    onChange={(event) => {
                      setSelectedClassId(event.target.value);
                      setSelectedLevel('');
                      setSelectedStudentId('');
                    }}
                  >
                    <option value="">Toutes les classes</option>
                    {classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.nom || `Classe ${classItem.id}`}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Niveau</label>
                  <select
                    className="form-select"
                    value={selectedLevel}
                    onChange={(event) => {
                      setSelectedLevel(event.target.value);
                      setSelectedStudentId('');
                    }}
                    disabled={!selectedClassId}
                  >
                    <option value="">{selectedClassId ? 'Tous les niveaux' : 'Choisir une classe d’abord'}</option>
                    {levels.map((level) => <option key={level} value={level}>{level}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Étudiant</label>
                  <select className="form-select" value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} disabled={!selectedClassId}>
                    <option value="">Tous les étudiants</option>
                    {classStudents
                      .filter((student) => !selectedLevel || (student.niveau || student.niveauEtude || selectedClass?.niveau) === selectedLevel)
                      .map((student) => <option key={student.id} value={student.id}>{student.nom} {student.prenom} {student.email ? `- ${student.email}` : ''}</option>)}
                  </select>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table align-middle table-hover">
                  <thead>
                    <tr><th>Étudiant</th><th>Email</th><th>Classe</th><th>Niveau</th><th>Paiements</th><th>Montant payé</th><th>Situation</th></tr>
                  </thead>
                  <tbody>
                    {studentFinanceRows.map((student) => {
                      const amountPaid = student.studentPayments.filter((payment) => payment.statut === 'PAYE').reduce((total, payment) => total + Number(payment.montant || 0), 0);
                      const studentLevel = student.niveau || student.niveauEtude || classes.find((item) => String(item.id) === String(getStudentClassId(student)))?.niveau || '—';
                      return (
                        <tr key={student.id}>
                          <td>{student.nom} {student.prenom}</td>
                          <td>{student.email || '—'}</td>
                          <td>{getStudentClassLabel(student, classes)}</td>
                          <td>{studentLevel}</td>
                          <td>{student.studentPayments.length}</td>
                          <td>{formatCurrency(amountPaid)}</td>
                          <td>
                            <span className={`badge-soft ${student.status === 'PAYE' ? 'success' : student.status === 'IMPAYE' ? 'danger' : 'warning'}`}>
                              {student.status === 'PAYE' ? 'Payé' : student.status === 'IMPAYE' ? 'Impayé' : 'Non inscrit'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {!studentFinanceRows.length && <tr><td colSpan="7" className="text-muted text-center">Aucun étudiant trouvé.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="app-card rounded-card p-3 mb-4">
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                <div className="flex-grow-1">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Rechercher par nom, email, référence ou statut"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>

                <button className="btn btn-primary" type="button" onClick={openCreateModal}>
                  Ajouter un paiement
                </button>
              </div>
            </div>

            <DataTable columns={columns} rows={filteredPaiements} emptyMessage="Aucun paiement trouvé." />
          </>
        )}
      </div>

      {isFormModalOpen && (
        <div className="student-modal-backdrop" onClick={closeFormModal}>
          <div className="student-modal confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-header">
              <h3>{editingPaiement ? 'Modifier le paiement' : 'Ajouter un paiement'}</h3>
              <button className="btn-close" type="button" onClick={closeFormModal} aria-label="Fermer" />
            </div>

            <div className="student-modal-body">
              {editingPaiement && (() => {
                const currentStudent = students.find((student) => String(student.id) === formData.etudiantId);

                return currentStudent ? (
                  <div className="alert alert-light border mb-3" role="alert">
                    <div className="fw-bold mb-1">Informations de l’étudiant</div>
                    <div className="mb-1">{currentStudent.nom} {currentStudent.prenom}</div>
                    <div className="small text-muted">
                      <div>Email : {currentStudent.email || '—'}</div>
                      <div>Rôle : {currentStudent.role || 'ETUDIANT'}</div>
                      <div>Classe : {getStudentClassLabel(currentStudent, classes)}</div>
                      <div>Date de création : {formatDate(currentStudent.dateCreation || currentStudent.createdAt || '—')}</div>
                    </div>
                  </div>
                ) : null;
              })()}

              <form onSubmit={handleFormSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Classe</label>
                    <select
                      className="form-select"
                      value={paymentClassId}
                      onChange={(event) => {
                        setPaymentClassId(event.target.value);
                        setPaymentLevel('');
                        setFormData((current) => ({ ...current, etudiantId: '' }));
                      }}
                      required
                    >
                      <option value="">Sélectionner une classe</option>
                      {classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.nom || `Classe ${classItem.id}`}</option>)}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Niveau</label>
                    <select
                      className="form-select"
                      value={paymentLevel}
                      onChange={(event) => {
                        setPaymentLevel(event.target.value);
                        setFormData((current) => ({ ...current, etudiantId: '' }));
                      }}
                      disabled={!paymentClassId}
                      required
                    >
                      <option value="">{paymentClassId ? 'Sélectionner un niveau' : 'Choisir une classe d’abord'}</option>
                      {paymentLevels.map((level) => <option key={level} value={level}>{level}</option>)}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Étudiant</label>
                    <div className="d-flex gap-2">
                      <select
                        className="form-select"
                        value={formData.etudiantId}
                        onChange={(event) => setFormData({ ...formData, etudiantId: event.target.value })}
                        required
                        disabled={!paymentClassId || !paymentLevel}
                      >
                        <option value="">{paymentLevel ? 'Sélectionner un étudiant' : 'Choisir un niveau d’abord'}</option>
                        {paymentStudents.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.nom} {student.prenom} {student.email ? `- ${student.email}` : ''}
                          </option>
                        ))}
                      </select>
                      {!editingPaiement && (
                        <button className="btn btn-outline-primary flex-shrink-0" type="button" onClick={openStudentForm}>
                          <i className="bi bi-person-plus me-1" />
                          Ajouter étudiant
                        </button>
                      )}
                    </div>
                  </div>

                  {!editingPaiement && (
                    <div className="col-12">
                      <div className="alert alert-light border mb-0">
                        <div className="fw-bold mb-1">Confirmation avant ajout</div>
                        <div className="small text-muted mb-2">
                          Le paiement doit être validé par un Directeur ou un Responsable financier.
                          {userRole && <span> Compte actuel : {userRole.replace('ROLE_', '').replace('_', ' ').toLowerCase()}.</span>}
                        </div>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="paymentConfirmed"
                            checked={paymentConfirmed}
                            onChange={(event) => setPaymentConfirmed(event.target.checked)}
                          />
                          <label className="form-check-label" htmlFor="paymentConfirmed">
                            Je confirme que ce paiement est autorisé par le Directeur ou le Responsable financier.
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="col-md-6">
                    <label className="form-label">Référence</label>
                    <input
                      className="form-control"
                      value={formData.referencePaiement}
                      onChange={(event) => setFormData({ ...formData, referencePaiement: event.target.value })}
                      required
                      readOnly={!editingPaiement}
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Type</label>
                    <select
                      className="form-select"
                      value={formData.typePaiement}
                      onChange={(event) => setFormData({ ...formData, typePaiement: event.target.value })}
                    >
                      <option value="MENSUALITE">MENSUALITE</option>
                      <option value="FRAIS_SCOLARITE">FRAIS_SCOLARITE</option>
                      <option value="FRAIS_INSCRIPTION">FRAIS_INSCRIPTION</option>
                      <option value="AUTRE">AUTRE</option>
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Montant</label>
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.montant}
                      onChange={(event) => setFormData({ ...formData, montant: event.target.value })}
                      required
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Date</label>
                    <input
                      className="form-control"
                      type="date"
                      value={formData.datePaiement}
                      onChange={(event) => setFormData({ ...formData, datePaiement: event.target.value })}
                      required
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Mode</label>
                    <select
                      className="form-select"
                      value={formData.mode}
                      onChange={(event) => setFormData({ ...formData, mode: event.target.value })}
                    >
                      <option value="ESPECES">ESPECES</option>
                      <option value="VIREMENT">VIREMENT</option>
                      <option value="CARTE_BANCAIRE">CARTE_BANCAIRE</option>
                      <option value="CHEQUE">CHEQUE</option>
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Statut</label>
                    <select
                      className="form-select"
                      value={formData.statut}
                      onChange={(event) => setFormData({ ...formData, statut: event.target.value })}
                    >
                      <option value="EN_ATTENTE">EN_ATTENTE</option>
                      <option value="PAYE">PAYE</option>
                      <option value="PARTIEL">PARTIEL</option>
                      <option value="EN_RETARD">EN_RETARD</option>
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Responsable financier</label>
                    {userRole === 'ROLE_DIRECTEUR' ? (
                      <select
                        className="form-select"
                        value={formData.responsableFinancierId}
                        onChange={(event) => setFormData({ ...formData, responsableFinancierId: event.target.value })}
                        required
                      >
                        <option value="">Choisir un responsable</option>
                        {financialManagers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.nom} {manager.prenom} - {manager.email}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="form-control bg-light">
                        {userProfile?.nom} {userProfile?.prenom} - {userProfile?.email}
                      </div>
                    )}
                  </div>
                </div>

                {errorMessage && (
                  <div className="alert alert-danger mt-3 mb-0" role="alert">
                    {errorMessage}
                  </div>
                )}

                <div className="student-modal-actions mt-4">
                  <button className="btn btn-outline-secondary" type="button" onClick={closeFormModal}>
                    Annuler
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={submitting}>
                    {submitting ? 'Enregistrement...' : editingPaiement ? 'Enregistrer les modifications' : 'Ajouter le paiement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isStudentFormOpen && (
        <div className="student-modal-backdrop" onClick={closeStudentForm}>
          <div className="student-modal confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-header">
              <div>
                <small className="student-modal-kicker">Nouveau dossier</small>
                <h3>Ajouter un étudiant avant le paiement</h3>
              </div>
              <button className="btn-close" type="button" onClick={closeStudentForm} aria-label="Fermer" />
            </div>
            <div className="student-modal-body">
              <form onSubmit={handleStudentSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Nom</label>
                    <input className="form-control" value={studentForm.nom} onChange={(event) => setStudentForm({ ...studentForm, nom: event.target.value })} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Prénom</label>
                    <input className="form-control" value={studentForm.prenom} onChange={(event) => setStudentForm({ ...studentForm, prenom: event.target.value })} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input className="form-control" type="email" value={studentForm.email} onChange={(event) => setStudentForm({ ...studentForm, email: event.target.value })} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Téléphone</label>
                    <input className="form-control" value={studentForm.telephone} onChange={(event) => setStudentForm({ ...studentForm, telephone: event.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Mot de passe initial</label>
                    <input className="form-control" type="password" value={studentForm.motDePasse} onChange={(event) => setStudentForm({ ...studentForm, motDePasse: event.target.value })} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Classe</label>
                    <select className="form-select" value={studentForm.classeId} onChange={(event) => setStudentForm({ ...studentForm, classeId: event.target.value })}>
                      <option value="">Aucune classe</option>
                      {classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.nom || `Classe ${classItem.id}`}</option>)}
                    </select>
                  </div>
                </div>
                {errorMessage && <div className="alert alert-danger mt-3 mb-0">{errorMessage}</div>}
                <div className="student-modal-actions mt-4">
                  <button className="btn btn-outline-secondary" type="button" onClick={closeStudentForm}>Annuler</button>
                  <button className="btn btn-primary" type="submit" disabled={studentSaving}>{studentSaving ? 'Création...' : 'Ajouter et continuer le paiement'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isDetailsModalOpen && selectedPaiement && (
        <div className="student-modal-backdrop" onClick={closeDetailsModal}>
          <div className="student-modal confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-header">
              <h3>Détails du paiement</h3>
              <button className="btn-close" type="button" onClick={closeDetailsModal} aria-label="Fermer" />
            </div>

            <div className="student-modal-body">
              {(() => {
                const studentDetails = students.find((student) => String(student.id) === String(selectedPaiement.etudiantId));

                return studentDetails ? (
                  <div className="alert alert-light border mb-3" role="alert">
                    <div className="fw-bold mb-1">Informations de l’étudiant</div>
                    <div className="mb-1">{studentDetails.nom} {studentDetails.prenom}</div>
                    <div className="small text-muted">
                      <div>Email : {studentDetails.email || '—'}</div>
                      <div>Rôle : {studentDetails.role || 'ETUDIANT'}</div>
                      <div>Classe : {getStudentClassLabel(studentDetails, classes)}</div>
                      <div>Date de création : {formatDate(studentDetails.dateCreation || studentDetails.createdAt || '—')}</div>
                    </div>
                  </div>
                ) : null;
              })()}

              {(() => {
                const studentDetails = students.find((student) => String(student.id) === String(selectedPaiement.etudiantId));

                return (
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Étudiant</label>
                      <div className="form-control bg-light">{selectedPaiement.nom} {selectedPaiement.prenom || ''}</div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <div className="form-control bg-light">{selectedPaiement.email || '—'}</div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Rôle</label>
                      <div className="form-control bg-light">{studentDetails?.role || 'ETUDIANT'}</div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Date de création</label>
                      <div className="form-control bg-light">{formatDate(studentDetails?.dateCreation || studentDetails?.createdAt || '—')}</div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Référence</label>
                      <div className="form-control bg-light">{selectedPaiement.referencePaiement || '—'}</div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Montant</label>
                      <div className="form-control bg-light">{formatCurrency(selectedPaiement.montant)}</div>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Type</label>
                      <div className="form-control bg-light">{selectedPaiement.typePaiement || '—'}</div>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Date</label>
                      <div className="form-control bg-light">{formatDate(selectedPaiement.datePaiement)}</div>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Statut</label>
                      <div className="form-control bg-light">{selectedPaiement.statut || '—'}</div>
                    </div>
                  </div>
                );
              })()}

              <div className="student-modal-actions mt-4">
                <button className="btn btn-outline-secondary" type="button" onClick={closeDetailsModal}>
                  Fermer
                </button>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => {
                    closeDetailsModal();
                    openEditModal(selectedPaiement);
                  }}
                >
                  Modifier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isReceiptModalOpen && receiptPaiement && (
        <div className="student-modal-backdrop" onClick={closeReceiptModal}>
          <div className="student-modal confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-header">
              <h3>Reçu de paiement</h3>
              <button className="btn-close" type="button" onClick={closeReceiptModal} aria-label="Fermer" />
            </div>

            <div className="student-modal-body">
              {receiptLoading ? (
                <div className="text-center py-4">Chargement du reçu...</div>
              ) : receiptPdfUrl ? (
                <>
                  <iframe
                    title="Payment Receipt"
                    src={receiptPdfUrl}
                    style={{ width: '100%', height: '520px', border: '1px solid #dee2e6', borderRadius: '8px' }}
                  />

                  <div className="student-modal-actions mt-4">
                    <button className="btn btn-outline-secondary" type="button" onClick={closeReceiptModal}>
                      Fermer
                    </button>
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={() => downloadReceiptPdf(receiptPaiement)}
                    >
                      Télécharger reçu
                    </button>
                  </div>
                </>
              ) : (
                <div className="alert alert-danger mb-0" role="alert">
                  Impossible d’afficher le reçu PDF pour ce paiement.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && pendingDeletePaiement && (
        <div className="student-modal-backdrop" onClick={closeDeleteModal}>
          <div className="student-modal confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="student-modal-header">
              <h3>Confirmer la suppression</h3>
              <button className="btn-close" type="button" onClick={closeDeleteModal} aria-label="Fermer" />
            </div>

            <div className="student-modal-body">
              <p className="mb-3">
                Êtes-vous sûr de vouloir supprimer le paiement <strong>{pendingDeletePaiement.referencePaiement}</strong> pour <strong>{pendingDeletePaiement.nom}</strong> ?
              </p>

              <div className="student-modal-actions">
                <button className="btn btn-outline-secondary" type="button" onClick={closeDeleteModal}>
                  Annuler
                </button>
                <button className="btn btn-danger" type="button" onClick={handleDelete}>
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FinancePage;
