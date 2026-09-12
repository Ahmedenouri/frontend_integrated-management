import { useEffect, useMemo, useState } from 'react';
import axiosClient from '../api/axiosClient';
import {
  addPaiement,
  deletePaiement,
  getAllClasses,
  getAllPaiements,
  getAllStudents,
  getDashboardFinancier,
  updatePaiement,
} from '../api/erpApi';
import DataTable from '../components/DataTable';
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
  const { userProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [paiements, setPaiements] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadFinance = async () => {
    try {
      const [{ data: financeData }, { data: paiementsData }, { data: studentsData }, { data: classesData }] = await Promise.all([
        getDashboardFinancier(),
        getAllPaiements(),
        getAllStudents(),
        getAllClasses(),
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

  const openCreateModal = () => {
    setEditingPaiement(null);
    setErrorMessage('');
    setFormData({
      ...initialPaymentForm,
      referencePaiement: generateUniquePaymentReference(paiements),
      responsableFinancierId: userProfile?.id ? String(userProfile.id) : '',
    });
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
                    <label className="form-label">Étudiant</label>
                    <select
                      className="form-select"
                      value={formData.etudiantId}
                      onChange={(event) => setFormData({ ...formData, etudiantId: event.target.value })}
                      required
                    >
                      <option value="">Sélectionner un étudiant</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.nom} {student.prenom}
                        </option>
                      ))}
                    </select>
                  </div>

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
                    <input
                      className="form-control"
                      type="number"
                      value={formData.responsableFinancierId}
                      onChange={(event) => setFormData({ ...formData, responsableFinancierId: event.target.value })}
                      placeholder="ID responsable"
                    />
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
