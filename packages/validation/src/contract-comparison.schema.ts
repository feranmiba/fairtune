import { z } from 'zod';

export const compareContractsSchema = z.object({
  sourceDocumentId: z.string().uuid('Source document ID must be a valid UUID'),
  targetDocumentId: z.string().uuid('Target document ID must be a valid UUID'),
  comparisonFocus: z.array(z.string()).optional(),
});

export type CompareContractsInput = z.infer<typeof compareContractsSchema>;
