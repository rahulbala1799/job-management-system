export const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export const ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/users/login`,
  REGISTER: `${API_BASE_URL}/users/register`,
  USERS: `${API_BASE_URL}/users/all`,
}; 