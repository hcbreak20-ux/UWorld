import axios from 'axios';
import type { User, Room, AuthResponse } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token aux requêtes
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Déconnecter SEULEMENT sur 401 des routes auth
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      
      // Si c'est /auth/me ou /auth/login → déconnexion
      if (url.includes('/auth/')) {
        console.log('🚪 Déconnexion: Token invalide');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        // Routes admin, etc. → juste log l'erreur
        console.error('❌ Accès refusé:', url);
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (username: string, email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },
  
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },
  
  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const roomAPI = {
  getPublicRooms: async (limit = 20, offset = 0): Promise<Room[]> => {
    const response = await api.get('/rooms', { params: { limit, offset } });
    return response.data;
  },
  
  getMyRooms: async (): Promise<Room[]> => {
    const response = await api.get('/rooms/my');
    return response.data;
  },
  
  getRoomById: async (id: string): Promise<Room> => {
    const response = await api.get(`/rooms/${id}`);
    return response.data;
  },
  
  createRoom: async (data: {
    name: string;
    description?: string;
    isPublic?: boolean;
    maxUsers?: number;
  }): Promise<Room> => {
    const response = await api.post('/rooms', data);
    return response.data;
  },
  
  updateRoom: async (id: string, data: Partial<Room>): Promise<Room> => {
    const response = await api.put(`/rooms/${id}`, data);
    return response.data;
  },
  
  deleteRoom: async (id: string): Promise<void> => {
    await api.delete(`/rooms/${id}`);
  },
};

export { api };
export default api;
