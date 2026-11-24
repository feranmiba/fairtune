-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('MATCHED', 'MISMATCHED', 'INCOMPLETE', 'PENDING_REVIEW');

-- CreateEnum
CREATE TYPE "AnomalySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AnomalyReviewStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'RESOLVED', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DEPOSIT_CONFIRMED', 'DISTRIBUTION_COMPLETED', 'PAYMENT_FAILED', 'PAYMENT_RECEIVED', 'DISCREPANCY_DETECTED', 'ANOMALY_DETECTED', 'SYSTEM');

-- CreateTable
CREATE TABLE "PaymentAsset" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "issuerPublicKey" TEXT,
    "decimals" INTEGER NOT NULL DEFAULT 7,
    "network" "StellarNetwork" NOT NULL DEFAULT 'TESTNET',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "collaboratorId" TEXT,
    "recipientAddress" TEXT NOT NULL,
    "amount" DECIMAL(18,7) NOT NULL,
    "amountSubunits" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "transactionHash" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "ledgerSequence" INTEGER,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StellarMonitoringCheckpoint" (
    "id" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "lastPagingToken" TEXT,
    "lastLedgerSequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StellarMonitoringCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReconciliation" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "expectedBalance" DECIMAL(18,7) NOT NULL,
    "observedOnChainBalance" DECIMAL(18,7) NOT NULL,
    "totalDeposited" DECIMAL(18,7) NOT NULL,
    "totalDistributed" DECIMAL(18,7) NOT NULL,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'MATCHED',
    "discrepancyCount" INTEGER NOT NULL DEFAULT 0,
    "detailsJson" JSONB,
    "reconciledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationFinding" (
    "id" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "findingType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "AnomalySeverity" NOT NULL DEFAULT 'MEDIUM',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoyaltyAnomaly" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "paymentId" TEXT,
    "anomalyType" TEXT NOT NULL,
    "severity" "AnomalySeverity" NOT NULL DEFAULT 'MEDIUM',
    "detectionReason" TEXT NOT NULL,
    "expectedValue" TEXT,
    "observedValue" TEXT,
    "aiExplanation" TEXT,
    "recommendedActions" TEXT,
    "reviewStatus" "AnomalyReviewStatus" NOT NULL DEFAULT 'PENDING',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoyaltyAnomaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnomalyReview" (
    "id" TEXT NOT NULL,
    "anomalyId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "previousStatus" "AnomalyReviewStatus" NOT NULL,
    "newStatus" "AnomalyReviewStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnomalyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "metadataJson" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAsset_contractAddress_key" ON "PaymentAsset"("contractAddress");
CREATE INDEX "PaymentAsset_code_idx" ON "PaymentAsset"("code");
CREATE INDEX "PaymentAsset_network_idx" ON "PaymentAsset"("network");
CREATE INDEX "PaymentAsset_isActive_idx" ON "PaymentAsset"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionHash_recipientAddress_key" ON "Payment"("transactionHash", "recipientAddress");
CREATE INDEX "Payment_agreementId_idx" ON "Payment"("agreementId");
CREATE INDEX "Payment_collaboratorId_idx" ON "Payment"("collaboratorId");
CREATE INDEX "Payment_recipientAddress_idx" ON "Payment"("recipientAddress");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_transactionHash_idx" ON "Payment"("transactionHash");
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StellarMonitoringCheckpoint_contractAddress_key" ON "StellarMonitoringCheckpoint"("contractAddress");
CREATE INDEX "StellarMonitoringCheckpoint_contractAddress_idx" ON "StellarMonitoringCheckpoint"("contractAddress");

-- CreateIndex
CREATE INDEX "PaymentReconciliation_agreementId_idx" ON "PaymentReconciliation"("agreementId");
CREATE INDEX "PaymentReconciliation_status_idx" ON "PaymentReconciliation"("status");
CREATE INDEX "PaymentReconciliation_reconciledAt_idx" ON "PaymentReconciliation"("reconciledAt");

-- CreateIndex
CREATE INDEX "ReconciliationFinding_reconciliationId_idx" ON "ReconciliationFinding"("reconciliationId");
CREATE INDEX "ReconciliationFinding_findingType_idx" ON "ReconciliationFinding"("findingType");
CREATE INDEX "ReconciliationFinding_resolved_idx" ON "ReconciliationFinding"("resolved");

-- CreateIndex
CREATE INDEX "RoyaltyAnomaly_agreementId_idx" ON "RoyaltyAnomaly"("agreementId");
CREATE INDEX "RoyaltyAnomaly_paymentId_idx" ON "RoyaltyAnomaly"("paymentId");
CREATE INDEX "RoyaltyAnomaly_severity_idx" ON "RoyaltyAnomaly"("severity");
CREATE INDEX "RoyaltyAnomaly_reviewStatus_idx" ON "RoyaltyAnomaly"("reviewStatus");
CREATE INDEX "RoyaltyAnomaly_detectedAt_idx" ON "RoyaltyAnomaly"("detectedAt");

-- CreateIndex
CREATE INDEX "AnomalyReview_anomalyId_idx" ON "AnomalyReview"("anomalyId");
CREATE INDEX "AnomalyReview_reviewerId_idx" ON "AnomalyReview"("reviewerId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_read_idx" ON "Notification"("read");
CREATE INDEX "Notification_type_idx" ON "Notification"("type");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "RoyaltyAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "PaymentAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReconciliation" ADD CONSTRAINT "PaymentReconciliation_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "RoyaltyAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationFinding" ADD CONSTRAINT "ReconciliationFinding_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "PaymentReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoyaltyAnomaly" ADD CONSTRAINT "RoyaltyAnomaly_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "RoyaltyAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoyaltyAnomaly" ADD CONSTRAINT "RoyaltyAnomaly_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyReview" ADD CONSTRAINT "AnomalyReview_anomalyId_fkey" FOREIGN KEY ("anomalyId") REFERENCES "RoyaltyAnomaly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnomalyReview" ADD CONSTRAINT "AnomalyReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
