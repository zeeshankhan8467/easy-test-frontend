import api from './api';

export interface Question {
  id: string;
  text: string;
  type: 'mcq' | 'true_false' | 'multiple_select';
  options: string[];
  correct_answer: number | number[];
  difficulty: 'easy' | 'medium' | 'hard';
  tags?: string[];
  marks?: number;
  created_at: string;
  updated_at: string;
}

export interface QuestionCreate {
  text: string;
  type: 'mcq' | 'true_false' | 'multiple_select';
  options: string[];
  correct_answer: number | number[];
  difficulty: 'easy' | 'medium' | 'hard';
  tags?: string[];
  marks?: number;
}

export interface AIGenerateRequest {
  topic: string;
  count: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  type?: 'mcq' | 'true_false' | 'multiple_select';
}

export interface QuestionImportParams {
  file: File;
}

export const questionService = {
  getAll: async (): Promise<Question[]> => {
    const response = await api.get<any>('/questions/');
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
    const response = await api.post<any>('/questions/generate/', data);
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

