import { z } from 'zod';
import { StellarNetwork } from '@fairtune/shared';

const stellarPublicKeyRegex = /^G[A-Z2-7]{55}$/;

export const participantInputSchema = z.object({
  collaboratorId: z.string().uuid().optional(),
  displayName: z.string().min(1, 'Display name is required').max(100).trim(),
  walletAddress: z
    .string()
    .regex(
      stellarPublicKeyRegex,
      'Invalid Stellar public wallet address format (must start with G and be 56 characters)',
    ),
  royaltyPercentage: z
    .number()
    .min(0.01, 'Minimum royalty split is 0.01%')
    .max(100.0, 'Maximum royalty split is 100.0%'),
});

export const createRoyaltyAgreementSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200).trim(),
    trackName: z.string().min(1, 'Track name is required').max(200).trim(),
    description: z.string().max(2000).trim().optional(),
    stellarNetwork: z.nativeEnum(StellarNetwork).default(StellarNetwork.TESTNET),
    participants: z
      .array(participantInputSchema)
      .min(1, 'At least one collaborator participant is required'),
  })
  .refine(
    (data) => {
      const sum = data.participants.reduce((acc, p) => acc + p.royaltyPercentage, 0);
      const rounded = Math.round(sum * 100) / 100;
      return Math.abs(rounded - 100.0) < 0.01;
    },
    {
      message: 'The sum of all participant royalty percentages must equal exactly 100.00%',
      path: ['participants'],
    },
  );

export const updateAgreementStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'REJECTED', 'TERMINATED']),
  reason: z.string().max(500).optional(),
});

export type ParticipantInput = z.infer<typeof participantInputSchema>;
export type CreateRoyaltyAgreementInput = z.infer<typeof createRoyaltyAgreementSchema>;
export type UpdateAgreementStatusInput = z.infer<typeof updateAgreementStatusSchema>;
