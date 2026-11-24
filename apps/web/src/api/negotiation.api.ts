import { api } from './client';
import { AIConversationDto, AIMessageDto } from '@fairtune/shared';

export const negotiationApi = {
  createConversation: async (documentId: string, title?: string): Promise<AIConversationDto> => {
    return api.post<AIConversationDto>('/negotiation/conversations', { documentId, title });
  },

  listConversations: async (documentId?: string): Promise<AIConversationDto[]> => {
    const query = documentId ? `?documentId=${documentId}` : '';
    return api.get<AIConversationDto[]>(`/negotiation/conversations${query}`);
  },

  getConversation: async (
    id: string,
  ): Promise<AIConversationDto & { messages: AIMessageDto[] }> => {
    return api.get<AIConversationDto & { messages: AIMessageDto[] }>(
      `/negotiation/conversations/${id}`,
    );
  },

  sendMessage: async (conversationId: string, content: string): Promise<AIMessageDto> => {
    return api.post<AIMessageDto>(`/negotiation/conversations/${conversationId}/messages`, {
      content,
    });
  },
};
