import api from './api';
import type { UserRole } from './auth';

export interface School {
  id: number;
  name: string;
  created_at: string;
}

export const schoolService = {
  getAll: async (): Promise<School[]> => {
    const response = await api.get<School[]>('/schools/');
    return Array.isArray(response.data) ? response.data : (response.data as any).results ?? [];
  },

  create: async (data: { name: string }): Promise<School> => {
    const response = await api.post<School>('/schools/', data);
    return response.data;
  },

  update: async (id: number, data: { name: string }): Promise<School> => {
    const response = await api.patch<School>(`/schools/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/schools/${id}/`);
  },

  createSchoolAdmin: async (data: { email: string; password: string; name?: string; school_id: number }) => {
    const response = await api.post('/auth/create-school-admin/', data);
    return response.data;
  },

  createTeacher: async (data: { email: string; password: string; name?: string; school_id?: number }) => {
    const response = await api.post('/auth/create-teacher/', data);
    return response.data;
  },
};

export function canCreateSchoolAdmin(role: UserRole | undefined): boolean {
  return role === 'super_admin';
}

export function canCreateTeacher(role: UserRole | undefined): boolean {
  return role === 'super_admin' || role === 'school_admin';
}

export function canManageSchools(role: UserRole | undefined): boolean {
  return role === 'super_admin';
}
