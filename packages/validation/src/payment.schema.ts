import { z } from 'zod';
import { StellarNetwork, PaymentStatus } from '@fairtune/shared';

export const createPaymentAssetSchema = z.object({
  code: z.string().min(1).max(12),
  name: z.string().min(1).max(100),
  contractAddress: z
    .string()
    .min(56)
    .max(56)
    .regex(/^C[A-Z0-9]{55}$/, 'Invalid Soroban contract address'),
  issuerPublicKey: z
    .string()
    .regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar public key')
    .optional()
    .nullable(),
  decimals: z.number().int().min(0).max(18).default(7),
  network: z.nativeEnum(StellarNetwork).default(StellarNetwork.TESTNET),
  isActive: z.boolean().default(true),
});

export const updatePaymentAssetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  decimals: z.number().int().min(0).max(18).optional(),
});

export const queryPaymentsSchema = z.object({
  agreementId: z.string().uuid().optional(),
  collaboratorId: z.string().uuid().optional(),
  recipientAddress: z.string().optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const recordPaymentSchema = z.object({
  agreementId: z.string().uuid(),
  collaboratorId: z.string().uuid().optional().nullable(),
  recipientAddress: z.string().regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar recipient public key'),
  amount: z.string().regex(/^\d+(\.\d{1,7})?$/, 'Amount must be a valid positive decimal string'),
  amountSubunits: z.string().regex(/^\d+$/, 'Amount subunits must be an integer string'),
  assetId: z.string().uuid(),
  transactionHash: z.string().optional().nullable(),
  status: z.nativeEnum(PaymentStatus).default(PaymentStatus.PENDING).optional(),
  ledgerSequence: z.number().int().positive().optional().nullable(),
});

export type CreatePaymentAssetInput = z.infer<typeof createPaymentAssetSchema>;
export type UpdatePaymentAssetInput = z.infer<typeof updatePaymentAssetSchema>;
export type QueryPaymentsInput = z.infer<typeof queryPaymentsSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
