-- AlterTable
ALTER TABLE "products" ADD COLUMN     "revenueAccountId" TEXT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_revenueAccountId_fkey" FOREIGN KEY ("revenueAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
