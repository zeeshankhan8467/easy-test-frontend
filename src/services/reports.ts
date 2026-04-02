import api from './api';

export interface QuestionAnalysis {
  question_id: string;
  question_text: string;
  total_attempts: number;
  correct_attempts: number;
  accuracy: number;
  average_time: number;
  options?: string[];
  option_display?: 'alpha' | 'numeric';
  correct_answer?: number[];
  option_votes?: number[];
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
  /** Total time (seconds), same basis as leaderboard — sum of per-question times. */
  time_taken: number;
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
  clicker_id?: string;
  parent_email_id?: string;
  parent_whatsapp?: string;
}

/** Daily attendance roster row (exam-independent). */
export interface DailyAttendanceParticipant extends AttendanceParticipant {
  marked: boolean;
}

export interface DailyAttendanceDay {
  date: string;
  participants: DailyAttendanceParticipant[];
  present_count: number;
  absent_count: number;
  unmarked_count: number;
  total_count: number;
}

export interface DailyAttendanceSummaryRow {
  date: string;
  present_count: number;
  absent_count: number;
  unmarked_count: number;
  total_count: number;
}

export type AttendanceRowStatus = 'present' | 'absent' | 'unmarked';

export interface ExamAttendance {
  exam_id: number;
  exam_title: string;
  participants: AttendanceParticipant[];
  present_count: number;
  total_count: number;
}

export interface SendAttendanceEmailRequest {
  scope: 'present' | 'absent' | 'all' | 'unmarked';
  subject: string;
  body: string;
  participant_ids?: number[];
}

export interface SendAttendanceEmailResponse {
  sent: number;
  skipped: number;
  errors: string[];
}

export interface SendAttendanceWhatsAppRequest {
  scope: 'present' | 'absent' | 'all' | 'unmarked';
  message: string;
  participant_ids?: number[];
}

export interface SendAttendanceWhatsAppResponse {
  sent: number;
  skipped: number;
  errors: string[];
  links: Array<{
    participant_id: number;
    student_name: string;
    phone: string;
    link: string;
  }>;
}

export interface StudentPerformanceRow {
  participant_id: number;
  admission_no: string;
  roll_no: string;
  student_name: string;
  class_name: string;
  section: string;
  teacher_name: string;
  subject: string;
  total_percentage: number;
}

export interface StudentPerformanceResponse {
  count: number;
  results: StudentPerformanceRow[];
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

  exportReport: async (examId: string, format: 'excel' | 'csv', layout?: 'individual' | 'questions' | 'personal_achievement'): Promise<Blob> => {
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

  sendAttendanceParentEmails: async (
    examId: string,
    data: SendAttendanceEmailRequest
  ): Promise<SendAttendanceEmailResponse> => {
    const response = await api.post<SendAttendanceEmailResponse>(
      `/exams/${examId}/attendance/send-parent-emails/`,
      data
    );
    return response.data;
  },

  sendAttendanceParentWhatsApp: async (
    examId: string,
    data: SendAttendanceWhatsAppRequest
  ): Promise<SendAttendanceWhatsAppResponse> => {
    const response = await api.post<SendAttendanceWhatsAppResponse>(
      `/exams/${examId}/attendance/send-parent-whatsapp/`,
      data
    );
    return response.data;
  },

  getStudentPerformanceReport: async (params?: {
    admission_no?: string;
    roll_no?: string;
    student_name?: string;
    class_name?: string;
    section?: string;
    teacher_name?: string;
    subject?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<StudentPerformanceResponse> => {
    const response = await api.get<StudentPerformanceResponse>('/reports/student-performance/', { params });
    return response.data;
  },

  exportStudentPerformanceReport: async (
    params?: {
      admission_no?: string;
      roll_no?: string;
      student_name?: string;
      class_name?: string;
      section?: string;
      teacher_name?: string;
      subject?: string;
      from_date?: string;
      to_date?: string;
      format?: 'excel' | 'csv';
    }
  ): Promise<Blob> => {
    const { format, ...rest } = params || {};
    const response = await api.get('/reports/student-performance/export/', {
      params: { ...rest, file_format: format || 'excel' },
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  exportAttendanceReport: async (
    examId: string,
    format: 'excel' | 'pdf'
  ): Promise<Blob> => {
    const response = await api.get(`/exams/${examId}/attendance/export/`, {
      params: { file_format: format },
      responseType: 'blob',
    });
    const blob = response.data as Blob;
    // If backend returns an error JSON, it may come as blob; caller can still handle via status.
    return blob;
  },

  getDailyAttendanceSummary: async (days?: number): Promise<DailyAttendanceSummaryRow[]> => {
    const response = await api.get<DailyAttendanceSummaryRow[]>('/attendance/summary/', {
      params: days != null ? { days } : {},
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  getDailyAttendanceDay: async (date: string): Promise<DailyAttendanceDay> => {
    const response = await api.get<DailyAttendanceDay>('/attendance/day/', { params: { date } });
    return response.data;
  },

  saveDailyAttendance: async (
    date: string,
    entries: Array<{ participant_id: number; status: AttendanceRowStatus }>
  ): Promise<{ saved: number; errors: string[] }> => {
    const response = await api.post<{ saved: number; errors: string[] }>('/attendance/day/save/', {
      date,
      entries,
    });
    return response.data;
  },

  exportDailyAttendanceReport: async (date: string, format: 'excel' | 'pdf'): Promise<Blob> => {
    const response = await api.get('/attendance/day/export/', {
      params: { date, file_format: format },
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  sendDailyAttendanceParentEmails: async (
    date: string,
    data: SendAttendanceEmailRequest
  ): Promise<SendAttendanceEmailResponse> => {
    const response = await api.post<SendAttendanceEmailResponse>(
      '/attendance/day/send-parent-emails/',
      { date, ...data }
    );
    return response.data;
  },

  sendDailyAttendanceParentWhatsApp: async (
    date: string,
    data: SendAttendanceWhatsAppRequest
  ): Promise<SendAttendanceWhatsAppResponse> => {
    const response = await api.post<SendAttendanceWhatsAppResponse>(
      '/attendance/day/send-parent-whatsapp/',
      { date, ...data }
    );
    return response.data;
  },
};

