import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
};

export const pacientesAPI = {
  getAll: (params) => api.get('/pacientes', { params }),
  getById: (id) => api.get(`/pacientes/${id}`),
  create: (data) => api.post('/pacientes', data),
  getCasos: (id) => api.get(`/pacientes/${id}/casos`),
};

export const casosAPI = {
  getAll: (params) => api.get('/casos', { params }),
  getById: (id) => api.get(`/casos/${id}`),
  create: (data) => api.post('/casos', data),
  update: (id, data) => api.put(`/casos/${id}`, data),
  createEmbedded: (data) => api.post('/embedded/caso', data),
};

export const motivosAPI = {
  getAll: (params) => api.get('/motivos', { params }),
  create: (data) => api.post('/motivos', data),
  update: (id, data) => api.put(`/motivos/${id}`, data),
};

export const interaccionesAPI = {
  getAll: (params) => api.get('/interacciones', { params }),
  create: (data) => api.post('/interacciones', data),
};

export const alertasAPI = {
  getAll: (params) => api.get('/alertas', { params }),
  markAsRead: (id) => api.put(`/alertas/${id}/marcar-leida`),
  verifySLA: () => api.post('/alertas/verificar-sla'),
};

export const metricasAPI = {
  getDashboard: () => api.get('/metricas/dashboard'),
  getCasosPorHora: (fecha) => api.get('/metricas/casos-por-hora', { params: { fecha } }),
  getCasosPorMotivo: (inicio, fin) => api.get('/metricas/casos-por-motivo', { params: { inicio, fin } }),
  getDesempenoAgentes: (inicio, fin) => api.get('/metricas/desempeno-agentes', { params: { inicio, fin } }),
};

export const usuariosAPI = {
  getAll: () => api.get('/usuarios'),
  create: (data) => api.post('/usuarios', data),
  update: (id, data) => api.put(`/usuarios/${id}`, data),
};

export const ubicacionesAPI = {
  getDepartamentos: () => api.get('/ubicaciones/departamentos'),
  getCiudades: (departamentoId) => api.get('/ubicaciones/ciudades', { params: { departamento_id: departamentoId } }),
};

export default api;
