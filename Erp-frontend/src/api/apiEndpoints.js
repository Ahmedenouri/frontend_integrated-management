import axiosClient from './axiosClient';

const createEndpoint = (method, url) => (payload = null, config = {}) => {
  const requestConfig = {
    method,
    url,
    ...config,
  };

  if (payload !== null && payload !== undefined) {
    requestConfig.data = payload;
  }

  return axiosClient(requestConfig);
};

export const apiEndpoints = {
  profile: {
    getMe: () => axiosClient.get('/api-profile/me'),
    updateMe: createEndpoint('PUT', '/api-profile/me'),
    changePassword: createEndpoint('POST', '/api-profile/change-password'),
  },

  dashboard: {
    getStats: () => axiosClient.get('/api-dashboard/stats'),
    getFinancier: () => axiosClient.get('/api-dashboard/financier'),
    getDiscipline: () => axiosClient.get('/api-dashboard/discipline'),
  },

  students: {
    getAll: () => axiosClient.get('/api-etudiant/getAllEtudiants'),
    getById: (id) => axiosClient.get(`/api-etudiant/getEtudiantById/${id}`),
    create: createEndpoint('POST', '/api-etudiant/add-Etudiant'),
    update: (id, payload) => axiosClient.put(`/api-etudiant/update-Etudiant/${id}`, payload),
    remove: (id) => axiosClient.delete(`/api-etudiant/delete-Etudiant/${id}`),
  },

  teachers: {
    getAll: () => axiosClient.get('/api-professeur/getAllProfesseurs'),
    getById: (id) => axiosClient.get(`/api-professeur/getProfesseurById/${id}`),
    create: createEndpoint('POST', '/api-professeur/add-Professeur'),
    update: (id, payload) => axiosClient.put(`/api-professeur/update-Professeur/${id}`, payload),
    remove: (id) => axiosClient.delete(`/api-professeur/delete-Professeur/${id}`),
    getMesClasses: () => axiosClient.get('/api-professeur/mes-classes'),
    getMesEtudiants: () => axiosClient.get('/api-professeur/mes-etudiants'),
  },

  finance: {
    getAllPaiements: () => axiosClient.get('/api-paiement/getAllPaiements'),
    getPaiementById: (id) => axiosClient.get(`/api-paiement/getPaiementById/${id}`),
    createPaiement: createEndpoint('POST', '/api-paiement/add-Paiement'),
    updatePaiement: (id, payload) => axiosClient.patch(`/api-paiement/update-Paiement/${id}`, payload),
    removePaiement: (id) => axiosClient.delete(`/api-paiement/delete-Paiement/${id}`),
    getImpayes: () => axiosClient.get('/api-paiement/impayes'),
    getMesPaiements: () => axiosClient.get('/api-paiement/mes-paiements'),
    createRecu: createEndpoint('POST', '/api-recu/add-Recu'),
    getRecus: () => axiosClient.get('/api-recu/getAllRecus'),
  },

  discipline: {
    getAllAbsences: () => axiosClient.get('/api-absence/getAllAbsences'),
    getMesAbsences: () => axiosClient.get('/api-absence/mes-absences'),
    createSanction: createEndpoint('POST', '/api-sanction/add-Sanction'),
    getAllSanctions: () => axiosClient.get('/api-sanction/getAllSanctions'),
    getMesSanctions: () => axiosClient.get('/api-sanction/mes-sanctions'),
  },

  academic: {
    getAllClasses: () => axiosClient.get('/api-classe/getAllClasses'),
    getClassById: (id) => axiosClient.get(`/api-classe/getClasseById/${id}`),
    createClass: createEndpoint('POST', '/api-classe/add-Classe'),
    updateClass: (id, payload) => axiosClient.put(`/api-classe/update-Classe/${id}`, payload),
    removeClass: (id) => axiosClient.delete(`/api-classe/delete-Classe/${id}`),

    getAllMatieres: () => axiosClient.get('/api-matiere/getAllMatieres'),
    getMatiereById: (id) => axiosClient.get(`/api-matiere/getMatiereById/${id}`),
    createMatiere: createEndpoint('POST', '/api-matiere/add-Matiere'),
    updateMatiere: (id, payload) => axiosClient.put(`/api-matiere/update-Matiere/${id}`, payload),
    removeMatiere: (id) => axiosClient.delete(`/api-matiere/delete-Matiere/${id}`),

    getAllEvaluations: () => axiosClient.get('/api-evaluation/getAllEvaluations'),
    getEvaluationById: (id) => axiosClient.get(`/api-evaluation/getEvaluationById/${id}`),
    createEvaluation: createEndpoint('POST', '/api-evaluation/add-Evaluation'),
    updateEvaluation: (id, payload) => axiosClient.put(`/api-evaluation/update-Evaluation/${id}`, payload),
    removeEvaluation: (id) => axiosClient.delete(`/api-evaluation/delete-Evaluation/${id}`),

    getAllSeances: () => axiosClient.get('/api-seance/getAllSeances'),
    getSeanceById: (id) => axiosClient.get(`/api-seance/getSeanceById/${id}`),
    getMesSeances: () => axiosClient.get('/api-seance/mes-seances'),

    getAllEmploisDuTemps: () => axiosClient.get('/api-emploi-du-temps/getAllEmploisDuTemps'),
    getEmploiById: (id) => axiosClient.get(`/api-emploi-du-temps/getEmploiDuTempsById/${id}`),
    getMonEmploiDuTemps: () => axiosClient.get('/api-emploi-du-temps/mon-emploi'),

    getAllBulletins: () => axiosClient.get('/api-bulletin/getAllBulletins'),
    getBulletinById: (id) => axiosClient.get(`/api-bulletin/getBulletinById/${id}`),
    downloadBulletinPdf: (etudiantId) => axiosClient.get(`/api-bulletin/pdf/${etudiantId}`, {
      responseType: 'blob',
    }),
  },

  notes: {
    getAll: () => axiosClient.get('/api-note/getAllNotes'),
    getById: (id) => axiosClient.get(`/api-note/getNoteById/${id}`),
    getMesNotes: () => axiosClient.get('/api-note/mes-notes'),
    create: createEndpoint('POST', '/api-note/add-Note'),
    update: (id, payload) => axiosClient.put(`/api-note/update-Note/${id}`, payload),
    remove: (id) => axiosClient.delete(`/api-note/delete-Note/${id}`),
    getMoyenneGenerale: (etudiantId) => axiosClient.get(`/api-note/moyenne-generale/${etudiantId}`),
    getMoyenneMatiere: (etudiantId, matiereId) => axiosClient.get(`/api-note/moyenne-matiere/${etudiantId}/${matiereId}`),
  },
};

export const {
  profile,
  dashboard,
  students,
  teachers,
  finance,
  discipline,
  academic,
  notes,
} = apiEndpoints;
