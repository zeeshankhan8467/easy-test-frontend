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

export interface AttendanceParticipant {
  id: number;
  name: string;
  email: string;
  present: boolean;
}

export interface ExamAttendance {
  exam_id: number;
  exam_title: string;
  participants: AttendanceParticipant[];
  present_count: number;
  total_count: number;
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

  exportReport: async (examId: string, format: 'excel' | 'csv', layout?: 'individual' | 'questions'): Promise<Blob> => {
    const params: { format: string; layout?: string } = { format };
    if (layout) params.layout = layout;
    const response = await api.get(`/report-export/${examId}/`, {
      params,
      responseType: 'blob',
    });
    if (response.status < 200 || response.status >= 300) {
      const text = await (response.data as Blob).text();
      const err = text ? (() => { try { return JSON.parse(text); } catch { return { detail: text }; } })() : { detail: 'Export failed' };
      throw Object.assign(new Error(err.error || err.detail || 'Export failed'), { response, data: err });
    }
    return response.data as Blob;
  },

  getAttendance: async (examId: string): Promise<ExamAttendance> => {
    const response = await api.get<ExamAttendance>(`/exams/${examId}/attendance/`);
    return response.data;
  },
};

