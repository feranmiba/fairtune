import { z } from 'zod';

export const createConversationSchema = z.object({
  documentId: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(200).trim(),
  initialMessage: z.string().min(1).max(4000).trim().optional(),
});

export const sendAIMessageSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty').max(4000).trim(),
  referencedClauseIds: z.array(z.string().uuid()).optional(),
  temperature: z.number().min(0).max(1).optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type SendAIMessageInput = z.infer<typeof sendAIMessageSchema>;
