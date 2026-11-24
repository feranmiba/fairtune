-- CreateEnum
CREATE TYPE "StellarTransactionType" AS ENUM ('AGREEMENT_CREATION', 'COLLABORATOR_APPROVAL', 'ESCROW_DEPOSIT', 'ROYALTY_DISTRIBUTION', 'AGREEMENT_CANCELLATION', 'OTHER');

-- AlterTable
ALTER TABLE "RoyaltyAgreement" ADD COLUMN "onChainAgreementId" TEXT,
ADD COLUMN "metadataHash" TEXT,
ADD COLUMN "paymentTokenAddress" TEXT,
ADD COLUMN "onChainStatus" TEXT,
ADD COLUMN "lastSyncedLedger" INTEGER,
ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AgreementParticipant" ADD COLUMN "onChainApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "onChainTxHash" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "transactionType" "StellarTransactionType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN "ledgerSequence" INTEGER,
ADD COLUMN "unsignedXdr" TEXT;

-- CreateIndex
CREATE INDEX "RoyaltyAgreement_onChainAgreementId_idx" ON "RoyaltyAgreement"("onChainAgreementId");

-- CreateIndex
CREATE INDEX "Transaction_transactionType_idx" ON "Transaction"("transactionType");
