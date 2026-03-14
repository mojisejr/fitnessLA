-- DropIndex
DROP INDEX "expenses_shiftId_idx";

-- DropIndex
DROP INDEX "journal_entries_sourceType_sourceId_idx";

-- DropIndex
DROP INDEX "orders_shiftId_idx";

-- AlterTable
ALTER TABLE "chart_of_accounts" ADD COLUMN     "description" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lockedReason" TEXT;
