import { z } from 'zod';

export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1).max(100).trim().optional(),
  lastName: z.string().min(1).max(100).trim().optional(),
  stageName: z.string().max(100).trim().optional(),
  bio: z.string().max(2000).trim().optional(),
  profileImage: z.string().url().max(500).optional().nullable(),
  country: z
    .string()
    .length(3, 'Country must be a 3-letter ISO code (e.g. USA, GBR)')
    .toUpperCase()
    .optional()
    .nullable(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
