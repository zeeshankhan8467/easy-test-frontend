import api from './api';

export interface DashboardStats {
  total_exams: number;
  total_participants: number;
  average_score: number;
  attendance_rate: number;
}

export interface RecentExam {
  id: string;
  title: string;
  created_at: string;
  participant_count: number;
  average_score: number;
}

export interface PerformanceData {
  date: string;
  score: number;
  participants: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recent_exams: RecentExam[];
  performance_data: PerformanceData[];
}

export const dashboardService = {
  getDashboard: async (): Promise<DashboardData> => {
    const response = await api.get<DashboardData>('/dashboard/');
    return response.data;
  },
};

