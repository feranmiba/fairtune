import { z } from 'zod';
import { AnomalySeverity, AnomalyReviewStatus } from '@fairtune/shared';

export const reviewAnomalySchema = z.object({
  status: z.nativeEnum(AnomalyReviewStatus),
  notes: z.string().max(2000).optional(),
});

export const queryAnomaliesSchema = z.object({
  agreementId: z.string().uuid().optional(),
  severity: z.nativeEnum(AnomalySeverity).optional(),
  reviewStatus: z.nativeEnum(AnomalyReviewStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const triggerReconciliationSchema = z.object({
  agreementId: z.string().uuid(),
});

export type ReviewAnomalyInput = z.infer<typeof reviewAnomalySchema>;
export type QueryAnomaliesInput = z.infer<typeof queryAnomaliesSchema>;
export type TriggerReconciliationInput = z.infer<typeof triggerReconciliationSchema>;
