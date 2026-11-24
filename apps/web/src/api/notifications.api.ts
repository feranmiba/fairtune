import { api } from './client';
import { NotificationDto } from '@fairtune/shared';

export const notificationsApi = {
  list: async (): Promise<NotificationDto[]> => {
    return api.get<NotificationDto[]>('/notifications');
  },

  getUnreadCount: async (): Promise<{ unreadCount: number }> => {
    return api.get<{ unreadCount: number }>('/notifications/unread-count');
  },

  markAsRead: async (id: string): Promise<NotificationDto> => {
    return api.patch<NotificationDto>(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<{ count: number }> => {
    return api.patch<{ count: number }>('/notifications/read-all');
  },
};
