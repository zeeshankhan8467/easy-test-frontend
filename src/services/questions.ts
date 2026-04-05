import api from './api';

export interface Question {
  id: string;
  text: string;
  type: 'mcq' | 'true_false' | 'multiple_select';
  options: string[];
  correct_answer: number | number[];
  option_display?: 'alpha' | 'numeric';
  difficulty: 'easy' | 'medium' | 'hard';
  tags?: string[];
  marks?: number;
  image_url?: string | null;
  video_url?: string | null;
  created_at: string;
  updated_at: string;
  owner_name?: string | null;
}

export interface QuestionCreate {
  text: string;
  type: 'mcq' | 'true_false' | 'multiple_select';
  options: string[];
  correct_answer: number | number[];
  option_display?: 'alpha' | 'numeric';
  difficulty: 'easy' | 'medium' | 'hard';
  tags?: string[];
  marks?: number;
  image_url?: string | null;
  video_url?: string | null;
}

export interface AIGenerateRequest {
  topic: string;
  count: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  type?: 'mcq' | 'true_false' | 'multiple_select';
  /** For MCQ: number of options per question (2-15). Optional; can also be specified in topic e.g. "with 10 options". */
  num_options?: number;
  /** Option label format: alpha (A,B,C) or numeric (1,2,3). Default alpha. */
  option_display?: 'alpha' | 'numeric';
}

export interface QuestionImportParams {
  file: File;
}

export interface QuestionListParams {
  school_id?: number;
  teacher_id?: number;
}

export const questionService = {
  getAll: async (params?: QuestionListParams): Promise<Question[]> => {
    const queryParams = new URLSearchParams();
    if (params?.school_id != null) queryParams.set('school_id', String(params.school_id));
    if (params?.teacher_id != null) queryParams.set('teacher_id', String(params.teacher_id));
    const qs = queryParams.toString();
    const url = qs ? `/questions/?${qs}` : '/questions/';
    const response = await api.get<any>(url);
    // Handle DRF pagination response
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    return [];
  },

  getById: async (id: string): Promise<Question> => {
    const response = await api.get<Question>(`/questions/${id}/`);
    return response.data;
  },

  create: async (data: QuestionCreate): Promise<Question> => {
    const response = await api.post<Question>('/questions/', data);
    return response.data;
  },

  update: async (id: string, data: Partial<QuestionCreate>): Promise<Question> => {
    const response = await api.patch<Question>(`/questions/${id}/`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/questions/${id}/`);
  },

  assignToExam: async (examId: string, questionIds: string[]): Promise<void> => {
    await api.post(`/exams/${examId}/questions/`, { question_ids: questionIds });
  },

  generateAI: async (data: AIGenerateRequest): Promise<any> => {
    const payload = {
      topic: data.topic,
      count: data.count,
      difficulty: data.difficulty ?? 'medium',
      type: data.type ?? 'mcq',
      ...(data.num_options != null && { num_options: data.num_options }),
      option_display: data.option_display ?? 'alpha',
    };
    const response = await api.post<any>('/questions/generate/', payload);
    // Handle both direct array response and wrapped response
    if (response.data.questions) {
      return response.data;
    } else if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data.results) {
      return { questions: response.data.results };
    }
    return response.data;
  },

  import: async (data: QuestionImportParams): Promise<{ imported: number; errors: string[] }> => {
    const formData = new FormData();
    formData.append('file', data.file);
    const response = await api.post<{ imported: number; errors: string[] }>(
      '/questions/import/',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
};

