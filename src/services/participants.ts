import api from './api';

/** Fixed participant form fields. Keypad ID required; name optional (backend uses keypad ID as name if empty). Matches backend import. */
export const PARTICIPANT_FIELDS = [
  { key: 'name', label: 'Name', required: false },
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
  { key: 'parent_whatsapp', label: 'Parent WhatsApp Number', required: false },
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
  name?: string;
  email?: string;
  clicker_id: string;
  [key: string]: string | undefined;
}

export interface ParticipantRow {
  name?: string;
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
  /** Applied when a row has no Class column or empty class (same scope as file import). */
  default_class?: string;
}

export interface ParticipantListParams {
  exam_id?: string;
  school_id?: number;
  teacher_id?: number;
  /** Filter roster by `extra.class` (exact match, trimmed on server). */
  class?: string;
}

export const participantService = {
  getAll: async (examIdOrParams?: string | ParticipantListParams): Promise<Participant[]> => {
    let params: ParticipantListParams = {};
    if (typeof examIdOrParams === 'string') {
      params = { exam_id: examIdOrParams };
    } else if (examIdOrParams && typeof examIdOrParams === 'object') {
      params = examIdOrParams;
    }
    const queryParams = new URLSearchParams();
    if (params.exam_id) queryParams.set('exam_id', params.exam_id);
    if (params.school_id != null) queryParams.set('school_id', String(params.school_id));
    if (params.teacher_id != null) queryParams.set('teacher_id', String(params.teacher_id));
    if (params.class != null && String(params.class).trim() !== '') {
      queryParams.set('class', String(params.class).trim());
    }
    const qs = queryParams.toString();
    const url = qs ? `/participants/?${qs}` : '/participants/';
    const response = await api.get<any>(url);
    // Handle DRF pagination response
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    return [];
  },

  /** Distinct `extra.class` values for the current scope (respects school / teacher filters, not `class`). */
  getDistinctClasses: async (params?: ParticipantListParams): Promise<string[]> => {
    const queryParams = new URLSearchParams();
    if (params?.exam_id) queryParams.set('exam_id', params.exam_id);
    if (params?.school_id != null) queryParams.set('school_id', String(params.school_id));
    if (params?.teacher_id != null) queryParams.set('teacher_id', String(params.teacher_id));
    const qs = queryParams.toString();
    const url = qs ? `/participants/distinct_classes/?${qs}` : '/participants/distinct_classes/';
    const response = await api.get<{ classes: string[] }>(url);
    return Array.isArray(response.data?.classes) ? response.data.classes : [];
  },

  getById: async (id: string): Promise<Participant> => {
    const response = await api.get<Participant>(`/participants/${id}/`);
    return response.data;
  },

  create: async (data: ParticipantCreate): Promise<Participant> => {
    const response = await api.post<Participant>('/participants/', data);
    return response.data;
  },

  /** Create multiple participants in one request. clicker_id required per row; name optional (defaults to clicker_id); email optional. */
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

  /** Permanently delete all participants in the same scope as GET (optional school_id / teacher_id). */
  deleteAll: async (params?: ParticipantListParams): Promise<{ deleted: number }> => {
    const queryParams: Record<string, string> = {};
    if (params?.exam_id) queryParams.exam_id = params.exam_id;
    if (params?.school_id != null) queryParams.school_id = String(params.school_id);
    if (params?.teacher_id != null) queryParams.teacher_id = String(params.teacher_id);
    if (params?.class != null && String(params.class).trim() !== '') {
      queryParams.class = String(params.class).trim();
    }
    const response = await api.post<{ deleted: number }>(
      '/participants/delete_all/',
      { confirm: true },
      { params: queryParams }
    );
    return response.data;
  },

  import: async (data: ParticipantImport): Promise<{ imported: number; errors: string[] }> => {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.exam_id) {
      formData.append('exam_id', data.exam_id);
    }
    if (data.default_class != null && String(data.default_class).trim() !== '') {
      formData.append('default_class', String(data.default_class).trim());
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

