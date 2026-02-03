import api from './api';

export interface QuestionAnalysis {
  question_id: string;
  question_text: string;
  total_attempts: number;
  correct_attempts: number;
  accuracy: number;
  average_time: number;
}

export interface ParticipantResult {
  participant_id: string;
  participant_name: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  unattempted: number;
  percentage: number;
  rank: number;
}

export interface ExamReport {
  exam_id: string;
  exam_title: string;
  total_participants: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  question_analysis: QuestionAnalysis[];
  participant_results: ParticipantResult[];
}

export interface PersonalAchievement {
  participant_id: string;
  participant_name: string;
  total_exams: number;
  average_score: number;
  best_score: number;
  improvement_trend: number;
  achievements: string[];
}

export const reportService = {
  getExamReport: async (examId: string): Promise<ExamReport> => {
    const response = await api.get<ExamReport>(`/reports/exams/${examId}/`);
    return response.data;
  },

  getQuestionAnalysis: async (examId: string): Promise<QuestionAnalysis[]> => {
    const response = await api.get<QuestionAnalysis[]>(`/reports/exams/${examId}/questions/`);
    return response.data;
  },

  getParticipantResults: async (examId: string): Promise<ParticipantResult[]> => {
    const response = await api.get<ParticipantResult[]>(`/reports/exams/${examId}/participants/`);
    return response.data;
  },

  getPersonalAchievement: async (participantId: string): Promise<PersonalAchievement> => {
    const response = await api.get<PersonalAchievement>(
      `/reports/participants/${participantId}/`
    );
    return response.data;
  },

  exportReport: async (examId: string, format: 'excel' | 'csv'): Promise<Blob> => {
    const response = await api.get(`/reports/exams/${examId}/export/`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },
};

