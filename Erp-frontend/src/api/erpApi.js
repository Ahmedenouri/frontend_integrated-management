import axiosClient from './axiosClient';

const normalizeRole = (role) => String(role || '').trim().toUpperCase().replace(/^ROLE_/, '');

export const getProfile = () => axiosClient.get('/api-profile/me');

export const updateProfile = (payload) => axiosClient.put('/api-profile/me', payload);

export const changePassword = (payload) => axiosClient.post('/api-profile/change-password', payload);

export const getDashboardStats = () => axiosClient.get('/api-dashboard/stats');

export const getDashboardFinancier = () => axiosClient.get('/api-dashboard/financier');

export const getDashboardDiscipline = () => axiosClient.get('/api-dashboard/discipline');

export const getAllStudents = () => axiosClient.get('/api-etudiant/getAllEtudiants');

export const getStudentById = (id) => axiosClient.get(`/api-etudiant/getEtudiantById/${id}`);

export const getAllUsers = () => axiosClient.get('/api-user/getAllUsers');

export const getUserById = (id) => axiosClient.get(`/api-user/getUserById/${id}`);

export const createUser = (role, payload) => {
  const normalizedRole = normalizeRole(role);

  switch (normalizedRole) {
    case 'ETUDIANT':
      return axiosClient.post('/api-etudiant/add-Etudiant', payload);
    case 'PROFESSEUR':
      return axiosClient.post('/api-professeur/add-Professeur', payload);
    case 'SURVEILLANT':
      return axiosClient.post('/api-surveillant/add-Surveillant', payload);
    case 'DIRECTEUR':
      return axiosClient.post('/api-directeur/add-Directeur', payload);
    case 'RESPONSABLE_FINANCIER':
      return axiosClient.post('/api-responsable-financier/add-ResponsableFinancier', payload);
    default:
      throw new Error(`Unsupported user role: ${role}`);
  }
};

export const updateUser = (role, id, payload) => {
  const normalizedRole = normalizeRole(role);

  switch (normalizedRole) {
    case 'ETUDIANT':
      return axiosClient.patch(`/api-etudiant/update-Etudiant/${id}`, payload);
    case 'PROFESSEUR':
      return axiosClient.patch(`/api-professeur/update-Professeur/${id}`, payload);
    case 'SURVEILLANT':
      return axiosClient.patch(`/api-surveillant/update-Surveillant/${id}`, payload);
    case 'DIRECTEUR':
      return axiosClient.patch(`/api-directeur/update-Directeur/${id}`, payload);
    case 'RESPONSABLE_FINANCIER':
      return axiosClient.patch(`/api-responsable-financier/update-ResponsableFinancier/${id}`, payload);
    default:
      throw new Error(`Unsupported user role: ${role}`);
  }
};

export const deleteUser = (role, id) => {
  const normalizedRole = normalizeRole(role);

  switch (normalizedRole) {
    case 'ETUDIANT':
      return axiosClient.delete(`/api-etudiant/delete-Etudiant/${id}`);
    case 'PROFESSEUR':
      return axiosClient.delete(`/api-professeur/delete-Professeur/${id}`);
    case 'SURVEILLANT':
      return axiosClient.delete(`/api-surveillant/delete-Surveillant/${id}`);
    case 'DIRECTEUR':
      return axiosClient.delete(`/api-directeur/delete-Directeur/${id}`);
    case 'RESPONSABLE_FINANCIER':
      return axiosClient.delete(`/api-responsable-financier/delete-ResponsableFinancier/${id}`);
    default:
      throw new Error(`Unsupported user role: ${role}`);
  }
};

export const createStudent = (payload) => axiosClient.post('/api-etudiant/add-Etudiant', payload);

export const updateStudent = (id, payload) => axiosClient.patch(`/api-etudiant/update-Etudiant/${id}`, payload);

export const deleteStudent = (id) => axiosClient.delete(`/api-etudiant/delete-Etudiant/${id}`);

export const getAllTeachers = () => axiosClient.get('/api-professeur/getAllProfesseurs');

export const createTeacher = (payload) => axiosClient.post('/api-professeur/add-Professeur', payload);

export const updateTeacher = (id, payload) => axiosClient.patch(`/api-professeur/update-Professeur/${id}`, payload);

export const deleteTeacher = (id) => axiosClient.delete(`/api-professeur/delete-Professeur/${id}`);

export const getAllSurveillants = () => axiosClient.get('/api-surveillant/getAllSurveillants');

export const getAllPaiements = () => axiosClient.get('/api-paiement/getAllPaiements');

export const getAllFinancialManagers = () => axiosClient.get('/api-responsable-financier/getAllResponsablesFinanciers');

export const createFinancialManager = (payload) => axiosClient.post('/api-responsable-financier/add-ResponsableFinancier', payload);

export const updateFinancialManager = (id, payload) => axiosClient.patch(`/api-responsable-financier/update-ResponsableFinancier/${id}`, payload);

export const deleteFinancialManager = (id) => axiosClient.delete(`/api-responsable-financier/delete-ResponsableFinancier/${id}`);

export const getPaiementById = (id) => axiosClient.get(`/api-paiement/getPaiementById/${id}`);

export const addPaiement = (payload) => axiosClient.post('/api-paiement/add-Paiement', payload);

export const updatePaiement = (id, payload) => axiosClient.patch(`/api-paiement/update-Paiement/${id}`, payload);

export const deletePaiement = (id) => axiosClient.delete(`/api-paiement/delete-Paiement/${id}`);

export const addRecu = (payload) => axiosClient.post('/api-recu/add-Recu', payload);

export const addSanction = (payload) => axiosClient.post('/api-sanction/add-Sanction', payload);

export const getAllSanctions = () => axiosClient.get('/api-sanction/getAllSanctions');

export const updateSanction = (id, payload) => axiosClient.patch(`/api-sanction/update-Sanction/${id}`, payload);

export const deleteSanction = (id) => axiosClient.delete(`/api-sanction/delete-Sanction/${id}`);

export const addNote = (payload) => axiosClient.post('/api-note/add-Note', payload);

export const getAllAbsences = () => axiosClient.get('/api-absence/getAllAbsences');

export const createAbsence = (payload) => axiosClient.post('/api-absence/add-Absence', payload);

export const updateAbsence = (id, payload) => axiosClient.patch(`/api-absence/update-Absence/${id}`, payload);

export const deleteAbsence = (id) => axiosClient.delete(`/api-absence/delete-Absence/${id}`);

export const getMesAbsences = () => axiosClient.get('/api-absence/mes-absences');

export const getAllSeances = () => axiosClient.get('/api-seance/getAllSeances');

export const getMesSeances = () => axiosClient.get('/api-seance/mes-seances');

export const getAllClasses = () => axiosClient.get('/api-classe/getAllClasses');

export const createClass = (payload) => axiosClient.post('/api-classe/add-Classe', payload);

export const updateClass = (id, payload) => axiosClient.patch(`/api-classe/update-Classe/${id}`, payload);

export const deleteClass = (id) => axiosClient.delete(`/api-classe/delete-Classe/${id}`);

export const getAllMatieres = () => axiosClient.get('/api-matiere/getAllMatieres');

export const createMatiere = (payload) => axiosClient.post('/api-matiere/add-Matiere', payload);

export const updateMatiere = (id, payload) => axiosClient.patch(`/api-matiere/update-Matiere/${id}`, payload);

export const deleteMatiere = (id) => axiosClient.delete(`/api-matiere/delete-Matiere/${id}`);

export const getAllEvaluations = () => axiosClient.get('/api-evaluation/getAllEvaluations');

export const getEvaluationById = (id) => axiosClient.get(`/api-evaluation/getEvaluationById/${id}`);

export const createEvaluation = (payload) => axiosClient.post('/api-evaluation/add-Evaluation', payload);

export const updateEvaluation = (id, payload) => axiosClient.patch(`/api-evaluation/update-Evaluation/${id}`, payload);

export const deleteEvaluation = (id) => axiosClient.delete(`/api-evaluation/delete-Evaluation/${id}`);

export const getAllEmploisDuTemps = () => axiosClient.get('/api-emploi-du-temps/getAllEmploisDuTemps');

export const createEmploiDuTemps = (payload) => axiosClient.post('/api-emploi-du-temps/add-EmploiDuTemps', payload);

export const updateEmploiDuTemps = (id, payload) => axiosClient.patch(`/api-emploi-du-temps/update-EmploiDuTemps/${id}`, payload);

export const deleteEmploiDuTemps = (id) => axiosClient.delete(`/api-emploi-du-temps/delete-EmploiDuTemps/${id}`);

export const getMonEmploiDuTemps = () => axiosClient.get('/api-emploi-du-temps/mon-emploi');

export const createSeance = (payload) => axiosClient.post('/api-seance/add-Seance', payload);

export const updateSeance = (id, payload) => axiosClient.patch(`/api-seance/update-Seance/${id}`, payload);

export const deleteSeance = (id) => axiosClient.delete(`/api-seance/delete-Seance/${id}`);

export const getAllSalles = () => axiosClient.get('/api-salle/getAllSalles');

export const getAllBulletins = () => axiosClient.get('/api-bulletin/getAllBulletins');

export const getMesNotes = () => axiosClient.get('/api-note/mes-notes');

export const getMesClasses = () => axiosClient.get('/api-professeur/mes-classes');

export const getMesEtudiants = () => axiosClient.get('/api-professeur/mes-etudiants');
