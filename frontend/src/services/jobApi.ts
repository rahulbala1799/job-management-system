import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Product } from './productApi';

const api = axios.create({
  baseURL: `${API_BASE_URL}/jobs`,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface JobItem {
  id?: number;
  product_id: number;
  product_name: string;
  product_category: Product['category'];
  quantity: number;
  work_completed?: number;
  is_printed?: boolean;
  width_m?: number;
  height_m?: number;
  unit_price: number;
  total_price: number;
  ink_cost_per_unit?: number;
  ink_consumption?: number;
}

export interface Job {
  id: number;
  customer_name: string;
  product_name: string;
  size: string;
  quantity: number;
  status: 'pending' | 'in_progress' | 'artwork_issue' | 'client_approval' | 'completed' | 'cancelled';
  total_cost: number;
  work_completed: number;
  ink_cost_per_unit?: number;
  ink_consumption?: number;
  due_date?: string;
  items: JobItem[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const jobApi = {
  // Get all jobs
  getAllJobs: async () => {
    const response = await api.get<Job[]>('/');
    return response.data;
  },

  // Get a job by ID
  getJobById: async (id: number) => {
    const response = await api.get<Job>(`/${id}`);
    return response.data;
  },

  // Create a new job
  createJob: async (job: Omit<Job, 'id' | 'created_at' | 'updated_at'>) => {
    const response = await api.post<Job>('/', job);
    return response.data;
  },

  // Update a job
  updateJob: async (id: number, job: Partial<Omit<Job, 'id' | 'created_at' | 'updated_at'>>) => {
    const response = await api.put<Job>(`/${id}`, job);
    return response.data;
  },

  // Delete a job
  deleteJob: async (id: number) => {
    await api.delete(`/${id}`);
  },

  // Update job status
  updateJobStatus: async (id: number, status: Job['status']) => {
    const response = await api.patch<Job>(`/${id}/status`, { status });
    return response.data;
  },

  // Update job progress and ink details
  updateJobProgress: async (id: number, updates: { 
    work_completed?: number; 
    ink_cost_per_unit?: number; 
    ink_consumption?: number;
  }) => {
    const response = await api.put<Job>(`/${id}`, updates);
    return response.data;
  },

  // Update job item progress
  updateJobItemProgress: async (jobId: number, itemId: number, updates: {
    work_completed?: number;
    ink_cost_per_unit?: number;
    ink_consumption?: number;
  }) => {
    const response = await api.put<JobItem>(`/${jobId}/items/${itemId}`, updates);
    return response.data;
  },
}; 