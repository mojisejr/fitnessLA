-- AlterTable
ALTER TABLE "training_service_enrollments"
ADD COLUMN "sessionsRemaining" INTEGER,
ADD COLUMN "closedAt" TIMESTAMP(3),
ADD COLUMN "closeReason" TEXT;

-- Backfill currently-known remaining sessions from historical session limits
UPDATE "training_service_enrollments"
SET "sessionsRemaining" = "sessionLimit"
WHERE "sessionsRemaining" IS NULL
  AND "sessionLimit" IS NOT NULL;