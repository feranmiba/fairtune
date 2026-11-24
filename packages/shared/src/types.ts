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
