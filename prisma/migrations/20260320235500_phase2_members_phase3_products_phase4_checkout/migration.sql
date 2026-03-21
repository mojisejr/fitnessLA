-- AlterTable
ALTER TABLE "products"
ADD COLUMN "trackStock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stockOnHand" INTEGER,
ADD COLUMN "membershipPeriod" TEXT,
ADD COLUMN "membershipDurationDays" INTEGER;

-- CreateTable
CREATE TABLE "member_subscriptions" (
    "id" TEXT NOT NULL,
    "memberCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "membershipProductId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "checkedInAt" TIMESTAMP(3),
    "renewedAt" TIMESTAMP(3),
    "renewalStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "member_subscriptions_memberCode_key" ON "member_subscriptions"("memberCode");

-- AddForeignKey
ALTER TABLE "member_subscriptions" ADD CONSTRAINT "member_subscriptions_membershipProductId_fkey" FOREIGN KEY ("membershipProductId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill existing product semantics
UPDATE "products"
SET
  "trackStock" = CASE WHEN "productType" = 'GOODS' THEN true ELSE false END,
  "stockOnHand" = CASE
    WHEN "productType" = 'GOODS' AND "sku" = 'WATER-01' THEN 18
    WHEN "productType" = 'GOODS' AND "sku" = 'COFFEE-01' THEN 20
    WHEN "productType" = 'GOODS' AND "sku" = 'SHAKE-01' THEN 6
    WHEN "productType" = 'GOODS' AND "sku" = 'COFFEE-11' THEN 20
    WHEN "productType" = 'GOODS' AND "sku" = 'COFFEE-12' THEN 18
    WHEN "productType" = 'GOODS' AND "sku" = 'COFFEE-13' THEN 18
    WHEN "productType" = 'GOODS' AND "sku" = 'COFFEE-14' THEN 16
    WHEN "productType" = 'GOODS' AND "sku" = 'COFFEE-15' THEN 16
    WHEN "productType" = 'GOODS' AND "sku" = 'COFFEE-16' THEN 16
    WHEN "productType" = 'GOODS' AND "sku" = 'COFFEE-17' THEN 16
    WHEN "productType" = 'GOODS' AND "sku" = 'COFFEE-18' THEN 10
    WHEN "productType" = 'GOODS' AND "sku" = 'COFFEE-19' THEN 10
    WHEN "productType" = 'GOODS' AND "sku" = 'COFFEE-20' THEN 12
    WHEN "productType" = 'GOODS' AND "sku" = 'COFFEE-21' THEN 12
    WHEN "productType" = 'GOODS' AND "sku" = 'FOOD-01' THEN 12
    WHEN "productType" = 'GOODS' AND "sku" = 'FOOD-02' THEN 10
    WHEN "productType" = 'GOODS' AND "sku" = 'FOOD-03' THEN 10
    WHEN "productType" = 'GOODS' AND "sku" = 'FOOD-04' THEN 10
    WHEN "productType" = 'GOODS' AND "sku" = 'FOOD-05' THEN 10
    ELSE "stockOnHand"
  END,
  "membershipPeriod" = CASE
    WHEN "productType" = 'MEMBERSHIP' AND "sku" = 'DAYPASS' THEN 'DAILY'
    WHEN "productType" = 'MEMBERSHIP' AND "sku" = 'MEM-MONTH' THEN 'MONTHLY'
    WHEN "productType" = 'MEMBERSHIP' AND "sku" = 'MEM-3MONTH' THEN 'QUARTERLY'
    WHEN "productType" = 'MEMBERSHIP' AND "sku" = 'MEM-6MONTH' THEN 'SEMIANNUAL'
    WHEN "productType" = 'MEMBERSHIP' AND "sku" = 'MEM-YEAR' THEN 'YEARLY'
    ELSE "membershipPeriod"
  END,
  "membershipDurationDays" = CASE
    WHEN "productType" = 'MEMBERSHIP' AND "sku" = 'DAYPASS' THEN 1
    WHEN "productType" = 'MEMBERSHIP' AND "sku" = 'MEM-MONTH' THEN 30
    WHEN "productType" = 'MEMBERSHIP' AND "sku" = 'MEM-3MONTH' THEN 90
    WHEN "productType" = 'MEMBERSHIP' AND "sku" = 'MEM-6MONTH' THEN 180
    WHEN "productType" = 'MEMBERSHIP' AND "sku" = 'MEM-YEAR' THEN 365
    ELSE "membershipDurationDays"
  END;