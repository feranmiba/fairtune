import { z } from 'zod';

export const createDocumentMetadataSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  originalFileName: z.string().min(1).max(255).trim(),
  mimeType: z.literal('application/pdf', {
    errorMap: () => ({ message: 'Only PDF contracts are supported' }),
  }),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024, 'File size must not exceed 10MB'),
});

export type CreateDocumentMetadataInput = z.infer<typeof createDocumentMetadataSchema>;
