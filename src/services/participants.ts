import api from './api';

/** Fixed participant form fields. Name and Keypad ID required; rest optional. Matches backend import column mapping. */
export const PARTICIPANT_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'clicker_id', label: 'Keypad ID', required: true },
  { key: 'roll_no', label: 'Roll No.', required: false },
  { key: 'admission_no', label: 'Admission No.', required: false },
  { key: 'class', label: 'Class', required: false },
  { key: 'subject', label: 'Subject', required: false },
  { key: 'section', label: 'Section', required: false },
  { key: 'team', label: 'Team', required: false },
  { key: 'group', label: 'Group', required: false },
  { key: 'house', label: 'House', required: false },
  { key: 'gender', label: 'Gender', required: false },
  { key: 'city', label: 'City', required: false },
  { key: 'uid', label: 'UID', required: false },
  { key: 'employee_code', label: 'Employee Code', required: false },
  { key: 'teacher_name', label: 'Teacher Name', required: false },
  { key: 'email_id', label: 'Email ID', required: false },
  { key: 'parent_email_id', label: 'Parent Email ID', required: false },
] as const;

export interface Participant {
  id: string;
  name: string;
  email?: string;
  clicker_id?: string;
  exam_id?: string;
  extra?: Record<string, string>;
  created_at: string;
  owner_name?: string | null;
}

export interface ParticipantCreate {
  name: string;
  email?: string;
  clicker_id: string;
  [key: string]: string | undefined;
}

export interface ParticipantRow {
  name: string;
  clicker_id: string;
  [key: string]: string | undefined;
}

/** User-defined custom field (e.g. email, rollno, class, gender). Stored in UI/localStorage. */
export interface CustomFieldDef {
  key: string;
  label: string;
}

export interface ParticipantImport {
  file: File;
  exam_id?: string;
}

export const participantService = {
  getAll: async (examId?: string): Promise<Participant[]> => {
    const url = examId ? `/participants/?exam_id=${examId}` : '/participants/';
    const response = await api.get<any>(url);
    // Handle DRF pagination response
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    return [];
  },

  getById: async (id: string): Promise<Participant> => {
    const response = await api.get<Participant>(`/participants/${id}/`);
    return response.data;
  },

  create: async (data: ParticipantCreate): Promise<Participant> => {
    const response = await api.post<Participant>('/participants/', data);
    return response.data;
  },

  /** Create multiple participants in one request. Name and clicker_id required per row; email optional. */
  bulkCreate: async (
    participants: ParticipantRow[]
  ): Promise<{ created: number; participants: Participant[]; errors: string[] }> => {
    const response = await api.post<{
      created: number;
      participants: Participant[];
      errors: string[];
    }>('/participants/bulk_create/', { participants });
    return response.data;
  },

  update: async (id: string, data: Partial<Pick<Participant, 'name' | 'email' | 'clicker_id' | 'extra'>>): Promise<Participant> => {
    const response = await api.patch<Participant>(`/participants/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/participants/${id}/`);
  },

  import: async (data: ParticipantImport): Promise<{ imported: number; errors: string[] }> => {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.exam_id) {
      formData.append('exam_id', data.exam_id);
    }
    const response = await api.post<{ imported: number; errors: string[] }>(
      '/participants/import/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  assignClickerId: async (participantId: string, clickerId: string): Promise<Participant> => {
    const response = await api.post<Participant>(
      `/participants/${participantId}/assign-clicker/`,
      { clicker_id: clickerId }
    );
    return response.data;
  },
};

