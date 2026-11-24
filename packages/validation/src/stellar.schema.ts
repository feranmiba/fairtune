import { z } from 'zod';
import { StellarNetwork } from '@fairtune/shared';

const stellarPublicKeyRegex = /^G[A-Z2-7]{55}$/;
const stellarContractAddressRegex = /^C[A-Z2-7]{55}$/;
const stellarTxHashRegex = /^[0-9a-fA-F]{64}$/;

export const verifyWalletAddressSchema = z.object({
  address: z
    .string()
    .regex(
      stellarPublicKeyRegex,
      'Invalid Stellar public address (must be a valid 56-character Ed25519 public key starting with G)',
    ),
  network: z.nativeEnum(StellarNetwork).default(StellarNetwork.TESTNET),
});

export const verifyTransactionSchema = z.object({
  transactionHash: z
    .string()
    .regex(
      stellarTxHashRegex,
      'Invalid Stellar transaction hash (must be a 64-character hex string)',
    ),
  network: z.nativeEnum(StellarNetwork).default(StellarNetwork.TESTNET),
});

export const prepareCreateAgreementTxSchema = z.object({
  agreementId: z.string().uuid('Agreement ID must be a valid UUID'),
  creatorPublicKey: z
    .string()
    .regex(stellarPublicKeyRegex, 'Creator must be a valid Stellar public address starting with G'),
  paymentTokenAddress: z
    .string()
    .regex(
      stellarContractAddressRegex,
      'Payment token address must be a valid Soroban contract address starting with C',
    ),
  network: z.nativeEnum(StellarNetwork).default(StellarNetwork.TESTNET),
});

export const prepareApproveAgreementTxSchema = z.object({
  collaboratorPublicKey: z
    .string()
    .regex(
      stellarPublicKeyRegex,
      'Collaborator must be a valid Stellar public address starting with G',
    ),
  network: z.nativeEnum(StellarNetwork).default(StellarNetwork.TESTNET),
});

export const prepareDepositEscrowTxSchema = z.object({
  depositorPublicKey: z
    .string()
    .regex(
      stellarPublicKeyRegex,
      'Depositor must be a valid Stellar public address starting with G',
    ),
  amount: z
    .string()
    .regex(/^[1-9][0-9]*$/, 'Deposit amount must be a positive integer in base token units'),
  network: z.nativeEnum(StellarNetwork).default(StellarNetwork.TESTNET),
});

export const prepareDistributeRoyaltiesTxSchema = z.object({
  callerPublicKey: z
    .string()
    .regex(stellarPublicKeyRegex, 'Caller must be a valid Stellar public address starting with G'),
  network: z.nativeEnum(StellarNetwork).default(StellarNetwork.TESTNET),
});

export const submitSignedTxSchema = z.object({
  signedTxXdr: z.string().min(1, 'Signed transaction XDR string cannot be empty').trim(),
  network: z.nativeEnum(StellarNetwork).default(StellarNetwork.TESTNET),
});

export type VerifyWalletAddressInput = z.infer<typeof verifyWalletAddressSchema>;
export type VerifyTransactionInput = z.infer<typeof verifyTransactionSchema>;
export type PrepareCreateAgreementTxInput = z.infer<typeof prepareCreateAgreementTxSchema>;
export type PrepareApproveAgreementTxInput = z.infer<typeof prepareApproveAgreementTxSchema>;
export type PrepareDepositEscrowTxInput = z.infer<typeof prepareDepositEscrowTxSchema>;
export type PrepareDistributeRoyaltiesTxInput = z.infer<typeof prepareDistributeRoyaltiesTxSchema>;
export type SubmitSignedTxInput = z.infer<typeof submitSignedTxSchema>;
