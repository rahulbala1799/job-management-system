import axios from 'axios';
import { API_BASE_URL } from '../config';

const api = axios.create({
  baseURL: `${API_BASE_URL}/users`,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: number;
  name?: string;
  username: string;
  email: string;
  role: 'admin' | 'employee';
  created_at?: string;
}

export interface UserFormData {
  name: string;
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'employee';
}

export const userApi = {
  // Get all users
  getAllUsers: async () => {
    const response = await api.get<User[]>('/');
    return response.data;
  },

  // Create a new user
  createUser: async (userData: UserFormData) => {
    const response = await api.post('/register', userData);
    return response.data;
  },

  // Delete a user
  deleteUser: async (userId: number) => {
    const response = await api.delete(`/${userId}`);
    return response.data;
  },

  // Login
  login: async (email: string, password: string) => {
    const response = await api.post('/login', { email, password });
    return response.data;
  },
}; 