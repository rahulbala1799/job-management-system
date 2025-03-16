import axios from 'axios';
import { API_BASE_URL } from '../config';

const api = axios.create({
  baseURL: `${API_BASE_URL}/products`,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface BaseProduct {
  id: number;
  name: string;
  category: 'packaging' | 'wide_format' | 'leaflets' | 'finished_product';
  created_at: string;
}

export interface PackagingProduct extends BaseProduct {
  category: 'packaging';
  product_code: string;
  unit_type: 'boxed' | 'units';
  units_per_box?: number;
  box_cost?: number;
  unit_cost: number;
}

export interface WideFormatProduct extends BaseProduct {
  category: 'wide_format';
  material: string;
  width_m: number;
  length_m: number;
  roll_cost: number;
  cost_per_sqm: number;
}

export interface LeafletsProduct extends BaseProduct {
  category: 'leaflets';
  material: string;
  thickness: string;
  cost_per_unit: number;
}

export interface FinishedProductComponent {
  id?: number;
  component_product_id: number;
  component_name?: string;
  quantity: number;
  area_sqm?: number;
}

export interface FinishedProduct extends BaseProduct {
  category: 'finished_product';
  material: string;
  cost_per_sqm: number;
  components: FinishedProductComponent[];
}

export type Product = PackagingProduct | WideFormatProduct | LeafletsProduct | FinishedProduct;

export const productApi = {
  // Get all products
  getAllProducts: async () => {
    const response = await api.get<Product[]>('/');
    return response.data;
  },

  // Get products by category
  getProductsByCategory: async (category: Product['category']) => {
    const response = await api.get<Product[]>(`/category/${category}`);
    return response.data;
  },

  // Create a new product
  createProduct: async (product: Omit<Product, 'id' | 'created_at'>) => {
    const response = await api.post<Product>('/', product);
    return response.data;
  },

  // Update a product
  updateProduct: async (id: number, product: Partial<Omit<Product, 'id' | 'created_at'>>) => {
    const response = await api.put<Product>(`/${id}`, product);
    return response.data;
  },

  // Delete a product
  deleteProduct: async (id: number) => {
    await api.delete(`/${id}`);
  },
  
  // Get finished product components
  getFinishedProductComponents: async (productId: number) => {
    const response = await api.get<FinishedProductComponent[]>(`/${productId}/components`);
    return response.data;
  },
  
  // Create a finished product with components
  createFinishedProduct: async (product: Omit<FinishedProduct, 'id' | 'created_at'>) => {
    const response = await api.post<FinishedProduct>('/finished', product);
    return response.data;
  },
}; 