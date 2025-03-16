import axios from 'axios';
import { API_BASE_URL } from '../config';

const api = axios.create({
  baseURL: `${API_BASE_URL}/customers`,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Customer {
  id: number;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
  created_at: string;
}

export interface CustomerFormData {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
}

export const customerApi = {
  // Get all customers
  getAllCustomers: async () => {
    const response = await api.get<Customer[]>('/');
    return response.data;
  },

  // Get a customer by ID
  getCustomerById: async (id: number) => {
    const response = await api.get<Customer>(`/${id}`);
    return response.data;
  },

  // Create a new customer
  createCustomer: async (customer: CustomerFormData) => {
    const response = await api.post<Customer>('/', customer);
    return response.data;
  },

  // Update a customer
  updateCustomer: async (id: number, customer: CustomerFormData) => {
    const response = await api.put<Customer>(`/${id}`, customer);
    return response.data;
  },

  // Delete a customer
  deleteCustomer: async (id: number) => {
    await api.delete(`/${id}`);
  },
}; 