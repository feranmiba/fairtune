import {
  UserRole,
  DocumentStatus,
  AnalysisStatus,
  RiskLevel,
  AgreementStatus,
  ApprovalStatus,
  StellarNetwork,
  TransactionStatus,
  ContractClauseCategory,
  PaymentStatus,
  ReconciliationStatus,
  AnomalySeverity,
  AnomalyReviewStatus,
  NotificationType,
} from './enums';

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ArtistProfileDto {
  id: string;
  userId: string;
  stageName: string;
  bio: string | null;
  profileImage: string | null;
  country: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDto {
  id: string;
  userId: string;
  title: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedClause {
  category: ContractClauseCategory;
  clauseTitle: string;
  extractedText: string;
  explanation: string;
  riskLevel: RiskLevel;
  riskJustification: string;
  suggestedCounterClause?: string;
}

export interface StructuredContractAnalysisResult {
  summary: string;
  overallRiskLevel: RiskLevel;
  partiesInvolved: string[];
  effectiveDate?: string;
  governingJurisdiction?: string;
  contractTerm?: string;
  clauses: ExtractedClause[];
  detectedRoyaltySplits?: Array<{
    beneficiary: string;
    percentage: number;
    basis: string;
  }>;
  redFlags: string[];
}

export interface ContractAnalysisDto {
  id: string;
  documentId: string;
  userId: string;
  status: AnalysisStatus;
  summary: string | null;
  overallRiskLevel: RiskLevel | null;
  analysisResult: StructuredContractAnalysisResult | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoyaltyAgreementDto {
  id: string;
  creatorId: string;
  title: string;
  trackName: string;
  description: string | null;
  status: AgreementStatus;
  totalAllocation: number; // e.g., 100.00
  stellarNetwork: StellarNetwork;
  contractAddress: string | null;
  onChainAgreementId?: string | null;
  paymentTokenAddress?: string | null;
  participants: AgreementParticipantDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CollaboratorDto {
  id: string;
  userId: string | null;
  displayName: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgreementParticipantDto {
  id: string;
  agreementId: string;
  collaboratorId: string;
  collaborator?: CollaboratorDto;
  royaltyPercentage: number;
  approvalStatus: ApprovalStatus;
  approvedAt: string | null;
}

export interface TransactionDto {
  id: string;
  agreementId: string;
  transactionHash: string;
  assetCode: string;
  amount: string; // Decimal representation
  status: TransactionStatus;
  createdAt: string;
}

export interface AIMessageReferenceDto {
  id: string;
  messageId: string;
  documentId: string;
  chunkId?: string | null;
  clauseId?: string | null;
  sourcePage?: number | null;
  sourceExcerpt: string;
  relevanceScore?: number | null;
}

export interface AIMessageDto {
  id: string;
  conversationId: string;
  sender: import('./enums').AIMessageSender;
  content: string;
  role: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model?: string | null;
  references?: AIMessageReferenceDto[];
  createdAt: string;
}

export interface AIConversationDto {
  id: string;
  userId: string;
  documentId?: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: AIMessageDto[];
}

export interface AIUsageLogDto {
  id: string;
  userId: string;
  taskType: import('./enums').AITaskType;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  durationMs: number;
  status: import('./enums').AIExecutionStatus;
  errorMessage?: string | null;
  createdAt: string;
}

export interface RoyaltySimulationParticipant {
  collaboratorName: string;
  role: string;
  percentage: number;
}

export interface RoyaltySimulationResult {
  grossRevenue: number;
  recoupableExpenses: number;
  netDistributableRevenue: number;
  participants: Array<{
    collaboratorName: string;
    role: string;
    percentage: number;
    allocatedAmount: number;
  }>;
  unallocatedRemainder: number;
  currency: string;
  notes: string[];
}

export interface RightsExtractionResult {
  trackTitle?: string;
  artists: string[];
  producers: string[];
  songwriters: string[];
  publishers: string[];
  recordLabels: string[];
  masterRightsOwner?: string;
  publishingRightsOwner?: string;
  territoryScope?: string;
  missingInformation: string[];
  inconsistencies: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: unknown;
}

export interface PaymentAssetDto {
  id: string;
  code: string;
  name: string;
  contractAddress: string;
  issuerPublicKey: string | null;
  decimals: number;
  network: StellarNetwork;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDto {
  id: string;
  agreementId: string;
  collaboratorId: string | null;
  recipientAddress: string;
  amount: string;
  amountSubunits: string;
  assetId: string;
  transactionHash: string | null;
  status: PaymentStatus;
  failureReason: string | null;
  ledgerSequence: number | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  asset?: PaymentAssetDto;
}

export interface PaymentReconciliationDto {
  id: string;
  agreementId: string;
  expectedBalance: string;
  observedOnChainBalance: string;
  totalDeposited: string;
  totalDistributed: string;
  status: ReconciliationStatus;
  discrepancyCount: number;
  detailsJson?: unknown;
  reconciledAt: string;
  findings?: ReconciliationFindingDto[];
}

export interface ReconciliationFindingDto {
  id: string;
  reconciliationId: string;
  findingType: string;
  description: string;
  severity: AnomalySeverity;
  resolved: boolean;
  createdAt: string;
}

export interface RoyaltyAnomalyDto {
  id: string;
  agreementId: string;
  paymentId: string | null;
  anomalyType: string;
  severity: AnomalySeverity;
  detectionReason: string;
  expectedValue: string | null;
  observedValue: string | null;
  aiExplanation: string | null;
  recommendedActions: string | null;
  reviewStatus: AnomalyReviewStatus;
  detectedAt: string;
}

export interface AnomalyReviewDto {
  id: string;
  anomalyId: string;
  reviewerId: string;
  previousStatus: AnomalyReviewStatus;
  newStatus: AnomalyReviewStatus;
  notes: string | null;
  createdAt: string;
}

export interface NotificationDto {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  metadataJson: unknown;
  read: boolean;
  createdAt: string;
}

export interface RoyaltyEarningsSummary {
  totalEarnings: number;
  totalDistributionsCount: number;
  currency: string;
  byTrack: Array<{
    trackName: string;
    totalAmount: number;
    paymentCount: number;
  }>;
  byCollaborator: Array<{
    collaboratorId: string;
    displayName: string;
    walletAddress: string;
    totalAmount: number;
  }>;
  byAsset: Array<{
    assetCode: string;
    totalAmount: number;
  }>;
}
