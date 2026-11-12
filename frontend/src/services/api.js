import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:3001/api`;
  }
  return 'http://localhost:3001/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Dynamic Request Interceptor: Always attach current token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pb_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Only clear token if backend explicitly confirms invalid/expired token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      error.response?.data?.error === 'Invalid or expired token'
    ) {
      console.warn('Session expired. Clearing invalid token.');
      localStorage.removeItem('pb_token');
      localStorage.removeItem('pb_user');
    }
    return Promise.reject(error);
  }
);

export default api;
