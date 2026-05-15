import api from './api';
import { Question } from './questions';

export interface ExamQuestion {
  id?: string;
  question: Question;
  question_id?: number;
  order: number;
  positive_marks: number;
  negative_marks: number;
  is_optional: boolean;
  /** When exam is revisable: allow changing answer after first submit for this slot */
  allow_revise?: boolean;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  duration: number; // seconds per question (for session timer)
  revisable: boolean;
  show_live_response: boolean;
  show_response_after_completion: boolean;
  question_change_automatic: boolean;
  status: 'draft' | 'frozen' | 'completed';
  positive_marking: number; // Legacy - kept for backward compatibility
  negative_marking: number; // Legacy
  frozen: boolean; // Legacy - use status instead
  created_at: string;
  updated_at: string;
  /** ISO datetime of latest exam attempt activity (last submit, or last start if none submitted). */
  last_attempt_at?: string | null;
  question_count?: number;
  participant_count?: number;
  /** Participant IDs explicitly assigned to this exam (via ExamParticipant). Returned by the API. */
  participant_ids?: number[];
  total_marks?: number;
  questions?: ExamQuestion[];
  can_edit?: boolean;
  school_id?: number | null;
  school_name?: string | null;
  owner_id?: number | null;
  owner_name?: string | null;
}

export interface ExamOwner {
  id: number;
  email: string;
  name: string;
  role: string;
  school_id: number | null;
  school_name: string;
}

export interface ExamQuestionInput {
  question_id: number;
  order: number;
  positive_marks: number;
  negative_marks: number;
  is_optional?: boolean;
  allow_revise?: boolean;
}

export interface ExamCreate {
  title: string;
  description?: string;
  duration: number;
  revisable: boolean;
  show_live_response: boolean;
  show_response_after_completion: boolean;
  question_change_automatic: boolean;
  questions?: ExamQuestionInput[]; // Optional for draft
  /**
   * Participant IDs to assign to the exam. On update, sending this list (even empty) replaces
   * the current assignment; omit the field to leave assignments untouched.
   */
  participant_ids?: number[];
  status?: 'draft' | 'frozen' | 'completed';
  owner_user_id?: number | null;
}

export interface ExamUpdate extends Partial<ExamCreate> {
  status?: 'draft' | 'frozen' | 'completed';
}

/** Response from GET /exams/available_questions/ (wrapped shape; legacy servers may return a bare array). */
export interface AvailableQuestionsResponse {
  questions: Question[];
  tags: string[];
}

export const examService = {
  getAll: async (params?: { school_id?: number; owner_user_id?: number }): Promise<Exam[]> => {
    const queryParams = new URLSearchParams();
    if (params?.school_id != null) queryParams.append('school_id', String(params.school_id));
    if (params?.owner_user_id != null) queryParams.append('owner_user_id', String(params.owner_user_id));
    const qs = queryParams.toString();
    const url = qs ? `/exams/?${qs}` : '/exams/';
    const response = await api.get<any>(url);
    // Handle DRF pagination response
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    return [];
  },

  getOwners: async (): Promise<ExamOwner[]> => {
    const response = await api.get<ExamOwner[]>('/users/exam-owners/');
    return Array.isArray(response.data) ? response.data : [];
  },

  getById: async (id: string): Promise<Exam> => {
    const response = await api.get<Exam>(`/exams/${id}/`);
    return response.data;
  },

  create: async (data: ExamCreate): Promise<Exam> => {
    const response = await api.post<Exam>('/exams/', data);
    return response.data;
  },

  update: async (id: string, data: ExamUpdate): Promise<Exam> => {
    const response = await api.patch<Exam>(`/exams/${id}/`, data);
    return response.data;
  },
  
  saveDraft: async (id: string, data: Partial<ExamCreate>): Promise<Exam> => {
    // Save exam as draft (partial update)
    const response = await api.patch<Exam>(`/exams/${id}/`, {
      ...data,
      status: 'draft',
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/exams/${id}/`);
  },

  freeze: async (id: string): Promise<Exam> => {
    const response = await api.post<Exam>(`/exams/${id}/freeze/`);
    return response.data;
  },

  generateSnapshot: async (id: string): Promise<Blob> => {
    const response = await api.get(`/exams/${id}/snapshot/`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getAvailableQuestions: async (params?: {
    exam_id?: string;
    difficulty?: string;
    type?: string;
    search?: string;
    /** Exact match against one tag string (same tags as on the question create form). */
    tag?: string;
  }): Promise<AvailableQuestionsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.exam_id) queryParams.append('exam_id', params.exam_id);
    if (params?.difficulty) queryParams.append('difficulty', params.difficulty);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.tag) queryParams.append('tag', params.tag);

    const response = await api.get<AvailableQuestionsResponse | Question[]>(
      `/exams/available_questions/?${queryParams.toString()}`
    );
    const d = response.data;
    if (Array.isArray(d)) {
      return { questions: d, tags: [] };
    }
    return {
      questions: Array.isArray(d?.questions) ? d.questions : [],
      tags: Array.isArray(d?.tags) ? d.tags : [],
    };
  },
};

