import api from './api';

export interface LeaderboardEntry {
  rank: number;
  participant_id: string;
  participant_name: string;
  score: number;
  percentage: number;
  total_questions: number;
  correct_answers: number;
  time_taken: number;
}

export interface Leaderboard {
  exam_id: string;
  exam_title: string;
  entries: LeaderboardEntry[];
  generated_at: string;
}

export const leaderboardService = {
  getExamLeaderboard: async (examId: string): Promise<Leaderboard> => {
    const response = await api.get<Leaderboard>(`/leaderboard/exams/${examId}/`);
    return response.data;
  },

  exportExamLeaderboard: async (
    examId: string,
    format: 'excel' | 'pdf'
  ): Promise<Blob> => {
    const response = await api.get(`/leaderboard/exams/${examId}/export/`, {
      params: { file_format: format },
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  getHistoricalComparison: async (examIds: string[]): Promise<Leaderboard[]> => {
    const response = await api.post<Leaderboard[]>('/leaderboard/compare/', {
      exam_ids: examIds,
    });
    return response.data;
  },
};

