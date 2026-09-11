import axios from 'axios';

const axiosClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const authHeader = localStorage.getItem('authHeader');
  const hasExplicitAuth = Boolean(config.headers?.Authorization);

  if (!hasExplicitAuth) {
    if (authHeader) {
      config.headers = {
        ...config.headers,
        Authorization: authHeader,
      };
    } else if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('authHeader');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userProfile');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
