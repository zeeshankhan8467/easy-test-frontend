import api from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export type UserRole = 'super_admin' | 'school_admin' | 'teacher';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  school_id?: number | null;
  school_name?: string | null;
  name?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login/', credentials);
    if (response.data.token) {
      const user = response.data.user;
      if ((user as any).role === 'admin') (user as any).role = 'super_admin';
      if ((user as any).role === 'instructor') (user as any).role = 'teacher';
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(user));
      window.dispatchEvent(new Event('authchange'));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('authchange'));
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    const user = JSON.parse(userStr) as User;
    if (user?.role === 'admin') user.role = 'super_admin';
    if (user?.role === 'instructor') user.role = 'teacher';
    return user;
  },

  getToken: (): string | null => {
    return localStorage.getItem('token');
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },
};

