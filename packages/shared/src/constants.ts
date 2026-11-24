export const API_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  ALLOWED_CONTRACT_MIME_TYPES: ['application/pdf'],
  TOTAL_ROYALTY_PERCENTAGE: 100.0,
  MIN_ROYALTY_PERCENTAGE: 0.01,
} as const;

export const QUEUE_NAMES = {
  DOCUMENT_PROCESSING: 'document-processing',
  CONTRACT_EXTRACTION: 'contract-extraction',
  CONTRACT_ANALYSIS: 'contract-analysis',
  EMBEDDING_GENERATION: 'embedding-generation',
  CONTRACT_COMPARISON: 'contract-comparison',
  ROYALTY_PROCESSING: 'royalty-processing',
  ROYALTY_ANOMALY_ANALYSIS: 'royalty-anomaly-analysis',
  STELLAR_VERIFICATION: 'stellar-verification',
  PAYMENT_RECONCILIATION: 'payment-reconciliation',
  STELLAR_MONITORING: 'stellar-monitoring',
} as const;

export const JOB_NAMES = {
  PROCESS_DOCUMENT: 'process-document',
  EXTRACT_CONTRACT: 'extract-contract',
  ANALYZE_CONTRACT: 'analyze-contract',
  GENERATE_EMBEDDINGS: 'generate-embeddings',
  COMPARE_CONTRACTS: 'compare-contracts',
  VERIFY_STELLAR_TX: 'verify-stellar-tx',
  DISTRIBUTE_ROYALTIES: 'distribute-royalties',
  DETECT_ROYALTY_ANOMALIES: 'detect-royalty-anomalies',
  RECONCILE_AGREEMENT: 'reconcile-agreement',
  POLL_STELLAR_EVENTS: 'poll-stellar-events',
} as const;
