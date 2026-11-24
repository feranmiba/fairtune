import { z } from 'zod';
import { RiskLevel, ContractClauseCategory } from '@fairtune/shared';

export const extractedClauseSchema = z.object({
  category: z.nativeEnum(ContractClauseCategory),
  clauseTitle: z.string().min(1).max(200),
  extractedText: z.string().min(1),
  explanation: z.string().min(1),
  riskLevel: z.nativeEnum(RiskLevel),
  riskJustification: z.string().min(1),
  suggestedCounterClause: z.string().optional(),
});

export const structuredContractAnalysisSchema = z.object({
  summary: z.string().min(10, 'Summary must be at least 10 characters'),
  overallRiskLevel: z.nativeEnum(RiskLevel),
  partiesInvolved: z.array(z.string().min(1)).min(1, 'At least one party must be identified'),
  effectiveDate: z.string().optional(),
  governingJurisdiction: z.string().optional(),
  contractTerm: z.string().optional(),
  clauses: z.array(extractedClauseSchema),
  detectedRoyaltySplits: z
    .array(
      z.object({
        beneficiary: z.string().min(1),
        percentage: z.number().min(0).max(100),
        basis: z.string().min(1),
      }),
    )
    .optional(),
  redFlags: z.array(z.string()),
});

export const triggerContractAnalysisSchema = z.object({
  focusCategories: z.array(z.nativeEnum(ContractClauseCategory)).optional(),
});

export type ExtractedClauseInput = z.infer<typeof extractedClauseSchema>;
export type StructuredContractAnalysisInput = z.infer<typeof structuredContractAnalysisSchema>;
export type TriggerContractAnalysisInput = z.infer<typeof triggerContractAnalysisSchema>;
