import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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

export const authService = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      const user = await api.get('/auth/me');
      localStorage.setItem('user', JSON.stringify(user.data));
      return user.data;
    }
    return null;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  verifyToken: async () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const response = await api.get('/auth/verify-token');
      return response.data;
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
  },
};

export const leadsService = {
  getLeads: async (params?: { 
    estado?: string; 
    origen?: string; 
    score_minimo?: number; 
    vendedor_id?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    limit?: number; 
    offset?: number 
  }) => {
    const response = await api.get('/leads/', { params });
    return response.data;
  },

  getLead: async (id: string) => {
    const response = await api.get(`/leads/${id}`);
    return response.data;
  },

  updateLead: async (id: string, data: any) => {
    const response = await api.patch(`/leads/${id}`, data);
    return response.data;
  },

  deleteLead: async (id: string) => {
    const response = await api.delete(`/leads/${id}`);
    return response.data;
  },

  deleteMultipleLeads: async (leadIds: string[]) => {
    const response = await api.post('/leads/bulk-delete', { lead_ids: leadIds });
    return response.data;
  },

  createLead: async (data: {
    nombre_completo: string;
    email: string;
    telefono?: string;
    empresa?: string;
    origen?: string;
  }) => {
    const response = await api.post('/leads/', data);
    return response.data;
  },

  getLeadConversations: async (id: string) => {
    const response = await api.get(`/leads/${id}/conversaciones`);
    return response.data;
  },

  getStats: async (params?: {
    fecha_desde?: string;
    fecha_hasta?: string;
  }) => {
    const response = await api.get('/leads/stats/resumen', { params });
    return response.data;
  },

  searchLeads: async (query: string) => {
    const response = await api.get('/leads/search/query', { params: { q: query } });
    return response.data;
  },

  getVendedores: async () => {
    const response = await api.get('/leads/vendedores');
    return response.data;
  },

  assignLeadToVendedor: async (leadId: string, vendedorId: string) => {
    const response = await api.patch(`/leads/${leadId}/asignar-vendedor?vendedor_id=${vendedorId}`);
    return response.data;
  },
};

export const usuariosService = {
  getUsuarios: async () => {
    const response = await api.get('/auth/usuarios');
    return response.data;
  },

  createUsuario: async (data: { email: string; password: string; nombre_completo: string; rol: string }) => {
    const response = await api.post('/auth/usuarios', data);
    return response.data;
  },

  updateUsuario: async (id: string, data: any) => {
    const response = await api.patch(`/auth/usuarios/${id}`, data);
    return response.data;
  },

  deleteUsuario: async (id: string) => {
    const response = await api.delete(`/auth/usuarios/${id}`);
    return response.data;
  },
};

export default api;
