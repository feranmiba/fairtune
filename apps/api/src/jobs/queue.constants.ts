import { QUEUE_NAMES, JOB_NAMES } from '@fairtune/shared';

export { QUEUE_NAMES, JOB_NAMES };

export interface ContractAnalysisJobData {
  analysisId: string;
  documentId: string;
  userId: string;
  storageKey: string;
  focusCategories?: string[];
}

export interface DocumentProcessingJobData {
  documentId: string;
  userId: string;
  storageKey: string;
}

export interface EmbeddingGenerationJobData {
  documentId: string;
  userId: string;
}

export interface ContractComparisonJobData {
  comparisonId: string;
  userId: string;
  sourceDocumentId: string;
  targetDocumentId: string;
}

export interface RoyaltyAnomalyJobData {
  agreementId: string;
  userId: string;
}
