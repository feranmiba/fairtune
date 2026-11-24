-- AlterEnum
ALTER TYPE "DocumentStatus" ADD VALUE 'EXTRACTED';
ALTER TYPE "DocumentStatus" ADD VALUE 'READY';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "pageCount" INTEGER,
ADD COLUMN "extractedText" TEXT,
ADD COLUMN "errorMessage" TEXT;

-- CreateTable
CREATE TABLE "RoyaltySimulationRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "grossRevenue" DECIMAL(18,2) NOT NULL,
    "recoupableExpenses" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netDistributableRevenue" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "participantsJson" JSONB NOT NULL,
    "notesJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoyaltySimulationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoyaltySimulationRecord_userId_idx" ON "RoyaltySimulationRecord"("userId");

-- AddForeignKey
ALTER TABLE "RoyaltySimulationRecord" ADD CONSTRAINT "RoyaltySimulationRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
