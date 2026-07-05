import { http, setAuthToken } from './http';

export interface User {
  id: number;
  username: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

export async function loginApi(username: string, password: string): Promise<AuthResponse> {
  const { data } = await http.post<AuthResponse>('/api/auth/login', { username, password });
  setAuthToken(data.token);
  return data;
}

export async function registerApi(username: string, password: string): Promise<AuthResponse> {
  const { data } = await http.post<AuthResponse>('/api/auth/register', { username, password });
  setAuthToken(data.token);
  return data;
}

export async function fetchMeApi(): Promise<User> {
  const { data } = await http.get<{ user: User }>('/api/auth/me');
  return data.user;
}

export function logoutApi(): void {
  setAuthToken(null);
}
