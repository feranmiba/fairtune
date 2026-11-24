import { z } from 'zod';

export const triggerRightsExtractionSchema = z.object({
  documentId: z.string().uuid(),
  compareWithDocumentIds: z.array(z.string().uuid()).optional(),
});

export const rightsExtractionResultSchema = z.object({
  trackTitle: z.string().optional(),
  artists: z.array(z.string()),
  producers: z.array(z.string()),
  songwriters: z.array(z.string()),
  publishers: z.array(z.string()),
  recordLabels: z.array(z.string()),
  masterRightsOwner: z.string().optional(),
  publishingRightsOwner: z.string().optional(),
  territoryScope: z.string().optional(),
  missingInformation: z.array(z.string()),
  inconsistencies: z.array(z.string()),
});

export type TriggerRightsExtractionInput = z.infer<typeof triggerRightsExtractionSchema>;
export type RightsExtractionResultInput = z.infer<typeof rightsExtractionResultSchema>;
