import axios from 'axios';
import { API_BASE_URL } from '../config';

const api = axios.create({
  baseURL: `${API_BASE_URL}/job-costing`,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface JobCost {
  id?: number;
  job_id: number;
  job_item_id: number;
  cost_type: 'ink' | 'material' | 'labor' | 'other';
  cost_amount: number;
  quantity: number;
  units: string;
  cost_per_unit: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export const jobCostingApi = {
  // Get all costs for a job
  getJobCosts: async (jobId: number) => {
    console.log(`Getting costs for job ID: ${jobId}`);
    try {
      const response = await api.get<JobCost[]>(`/job/${jobId}`);
      console.log(`Job ${jobId} costs response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error getting costs for job ${jobId}:`, error);
      throw error;
    }
  },

  // Get all costs for a job item
  getJobItemCosts: async (itemId: number) => {
    console.log(`Getting costs for job item ID: ${itemId}`);
    try {
      const response = await api.get<JobCost[]>(`/job-item/${itemId}`);
      console.log(`Job item ${itemId} costs response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error getting costs for job item ${itemId}:`, error);
      throw error;
    }
  },

  // Add a new cost
  addJobCost: async (cost: Omit<JobCost, 'id' | 'created_at' | 'updated_at'>) => {
    const response = await api.post<JobCost>('/', cost);
    return response.data;
  },

  // Update a cost
  updateJobCost: async (id: number, cost: Partial<Omit<JobCost, 'id' | 'job_id' | 'job_item_id' | 'created_at' | 'updated_at'>>) => {
    const response = await api.put<JobCost>(`/${id}`, cost);
    return response.data;
  },

  // Delete a cost
  deleteJobCost: async (id: number) => {
    await api.delete(`/${id}`);
  },
  
  // Helper function to add ink costs for packaging items
  addPackagingInkCost: async (jobId: number, jobItemId: number, costPerUnit: number, quantity: number) => {
    const cost: Omit<JobCost, 'id' | 'created_at' | 'updated_at'> = {
      job_id: jobId,
      job_item_id: jobItemId,
      cost_type: 'ink',
      cost_per_unit: costPerUnit,
      quantity: quantity,
      units: 'units',
      cost_amount: costPerUnit * quantity,
    };
    
    return await api.post<JobCost>('/', cost);
  },
  
  // Helper function to add ink costs for wide format items
  addWideFormatInkCost: async (jobId: number, jobItemId: number, costPerMl: number, consumptionMl: number) => {
    const cost: Omit<JobCost, 'id' | 'created_at' | 'updated_at'> = {
      job_id: jobId,
      job_item_id: jobItemId,
      cost_type: 'ink',
      cost_per_unit: costPerMl,
      quantity: consumptionMl,
      units: 'ml',
      cost_amount: costPerMl * consumptionMl,
    };
    
    return await api.post<JobCost>('/', cost);
  }
}; 