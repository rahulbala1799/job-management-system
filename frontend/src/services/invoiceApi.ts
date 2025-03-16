import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Product } from './productApi';

const api = axios.create({
  baseURL: `${API_BASE_URL}/invoices`,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  product_id?: number;
  product_name?: string;
  product_category?: Product['category'];
  description: string;
  quantity: number;
  unit_price: number;
  width_m?: number;
  height_m?: number;
  total_price: number;
  created_at?: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer_name?: string;
  customer_company?: string;
  customer_address?: string;
  customer_city?: string;
  customer_postal_code?: string;
  customer_country?: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  vat_rate: '23' | '13.5' | '9';
  vat_amount: number;
  total_amount: number;
  notes?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  items: InvoiceItem[];
  created_at: string;
}

export interface InvoiceFormData {
  customer_id: number;
  issue_date: string;
  due_date: string;
  subtotal: number;
  vat_rate: '23' | '13.5' | '9';
  vat_amount: number;
  total_amount: number;
  notes?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  items: InvoiceItem[];
}

export const invoiceApi = {
  // Get all invoices
  getAllInvoices: async () => {
    const response = await api.get<Invoice[]>('/');
    return response.data;
  },

  // Get an invoice by ID
  getInvoiceById: async (id: number) => {
    const response = await api.get<Invoice>(`/${id}`);
    return response.data;
  },

  // Create a new invoice
  createInvoice: async (invoice: InvoiceFormData) => {
    const response = await api.post<Invoice>('/', invoice);
    return response.data;
  },

  // Update an invoice
  updateInvoice: async (id: number, invoice: InvoiceFormData) => {
    const response = await api.put<Invoice>(`/${id}`, invoice);
    return response.data;
  },

  // Delete an invoice
  deleteInvoice: async (id: number) => {
    await api.delete(`/${id}`);
  },

  // Generate job from invoice
  generateJob: async (id: number) => {
    const response = await api.post(`/${id}/generate-job`);
    return response.data;
  },
}; 