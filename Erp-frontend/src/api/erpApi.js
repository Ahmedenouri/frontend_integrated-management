import axiosClient from './axiosClient';

export const getProfile = () => axiosClient.get('/api-profile/me');

export const updateProfile = (payload) => axiosClient.put('/api-profile/me', payload);

export const changePassword = (payload) => axiosClient.post('/api-profile/change-password', payload);

export const getDashboardStats = () => axiosClient.get('/api-dashboard/stats');

export const getDashboardFinancier = () => axiosClient.get('/api-dashboard/financier');

export const getDashboardDiscipline = () => axiosClient.get('/api-dashboard/discipline');

export const getAllStudents = () => axiosClient.get('/api-etudiant/getAllEtudiants');

export const createStudent = (payload) => axiosClient.post('/api-etudiant/add-Etudiant', payload);

export const updateStudent = (id, payload) => axiosClient.patch(`/api-etudiant/update-Etudiant/${id}`, payload);

export const deleteStudent = (id) => axiosClient.delete(`/api-etudiant/delete-Etudiant/${id}`);

export const getAllTeachers = () => axiosClient.get('/api-professeur/getAllProfesseurs');

export const getAllPaiements = () => axiosClient.get('/api-paiement/getAllPaiements');

export const getPaiementById = (id) => axiosClient.get(`/api-paiement/getPaiementById/${id}`);

export const addPaiement = (payload) => axiosClient.post('/api-paiement/add-Paiement', payload);

export const updatePaiement = (id, payload) => axiosClient.patch(`/api-paiement/update-Paiement/${id}`, payload);

export const deletePaiement = (id) => axiosClient.delete(`/api-paiement/delete-Paiement/${id}`);

export const addRecu = (payload) => axiosClient.post('/api-recu/add-Recu', payload);

export const addSanction = (payload) => axiosClient.post('/api-sanction/add-Sanction', payload);

export const addNote = (payload) => axiosClient.post('/api-note/add-Note', payload);

export const getAllAbsences = () => axiosClient.get('/api-absence/getAllAbsences');

export const getMesAbsences = () => axiosClient.get('/api-absence/mes-absences');

export const getAllSeances = () => axiosClient.get('/api-seance/getAllSeances');

export const getMesSeances = () => axiosClient.get('/api-seance/mes-seances');

export const getAllClasses = () => axiosClient.get('/api-classe/getAllClasses');

export const getAllMatieres = () => axiosClient.get('/api-matiere/getAllMatieres');

export const getAllEvaluations = () => axiosClient.get('/api-evaluation/getAllEvaluations');

export const getAllEmploisDuTemps = () => axiosClient.get('/api-emploi-du-temps/getAllEmploisDuTemps');

export const getMonEmploiDuTemps = () => axiosClient.get('/api-emploi-du-temps/mon-emploi');

export const getAllBulletins = () => axiosClient.get('/api-bulletin/getAllBulletins');

export const getMesNotes = () => axiosClient.get('/api-note/mes-notes');

export const getMesClasses = () => axiosClient.get('/api-professeur/mes-classes');

export const getMesEtudiants = () => axiosClient.get('/api-professeur/mes-etudiants');
