import { api } from './client';
import { DocumentDto } from '@fairtune/shared';

export const documentsApi = {
  upload: async (file: File, title: string): Promise<DocumentDto> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    return api.post<DocumentDto>('/documents', formData);
  },

  list: async (): Promise<DocumentDto[]> => {
    return api.get<DocumentDto[]>('/documents');
  },

  getById: async (id: string): Promise<DocumentDto> => {
    return api.get<DocumentDto>(`/documents/${id}`);
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    return api.delete<{ success: boolean }>(`/documents/${id}`);
  },
};
