-- AlterTable
ALTER TABLE "member_subscriptions" ADD COLUMN     "renewalMethod" TEXT NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "trainers" (
    "id" TEXT NOT NULL,
    "trainerCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nickname" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_service_enrollments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "memberSubscriptionId" TEXT,
    "trainerId" TEXT,
    "packageProductId" TEXT NOT NULL,
    "customerNameSnapshot" TEXT NOT NULL,
    "packageNameSnapshot" TEXT NOT NULL,
    "packageSkuSnapshot" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "sessionLimit" INTEGER,
    "priceSnapshot" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_service_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trainers_trainerCode_key" ON "trainers"("trainerCode");

-- CreateIndex
CREATE INDEX "training_service_enrollments_trainerId_idx" ON "training_service_enrollments"("trainerId");

-- CreateIndex
CREATE INDEX "training_service_enrollments_memberSubscriptionId_idx" ON "training_service_enrollments"("memberSubscriptionId");

-- CreateIndex
CREATE INDEX "training_service_enrollments_orderId_idx" ON "training_service_enrollments"("orderId");

-- AddForeignKey
ALTER TABLE "training_service_enrollments" ADD CONSTRAINT "training_service_enrollments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_service_enrollments" ADD CONSTRAINT "training_service_enrollments_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_service_enrollments" ADD CONSTRAINT "training_service_enrollments_memberSubscriptionId_fkey" FOREIGN KEY ("memberSubscriptionId") REFERENCES "member_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_service_enrollments" ADD CONSTRAINT "training_service_enrollments_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_service_enrollments" ADD CONSTRAINT "training_service_enrollments_packageProductId_fkey" FOREIGN KEY ("packageProductId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
