import axios from 'axios';

const API_URL = import.meta.env.VITE_URL_SERVER || 'http://localhost:3000';
const TOKEN_KEY = 'auth_token';

export const http = axios.create({ baseURL: API_URL });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const setAuthToken = (token: string | null): void => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

export const getAuthToken = (): string | null => localStorage.getItem(TOKEN_KEY);
