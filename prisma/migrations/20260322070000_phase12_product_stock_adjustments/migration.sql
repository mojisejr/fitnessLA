CREATE TABLE "product_stock_adjustments" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "addedQuantity" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "note" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdByUserName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_stock_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_stock_adjustments_productId_createdAt_idx" ON "product_stock_adjustments"("productId", "createdAt");
CREATE INDEX "product_stock_adjustments_createdByUserId_idx" ON "product_stock_adjustments"("createdByUserId");

ALTER TABLE "product_stock_adjustments"
ADD CONSTRAINT "product_stock_adjustments_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;