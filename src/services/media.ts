import api from './api';

/** Upload image or video for question rich text; returns absolute URL from server. */
export async function uploadQuestionMedia(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post<{ url: string; detail?: string }>('/upload/question-media/', formData, {
    transformRequest: (data, headers) => {
      if (data instanceof FormData) {
        delete headers['Content-Type'];
      }
      return data;
    },
  });
  const url = res.data?.url;
  if (!url) {
    const d = res.data?.detail;
    throw new Error(typeof d === 'string' ? d : 'Upload failed');
  }
  return url;
}
