-- CreateTable
CREATE TABLE "attendance_devices" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "registeredIp" TEXT,
    "userAgent" TEXT,
    "approvedByUserId" TEXT NOT NULL,
    "approvedByUserName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_devices_tokenHash_key" ON "attendance_devices"("tokenHash");

-- CreateIndex
CREATE INDEX "attendance_devices_isActive_updatedAt_idx" ON "attendance_devices"("isActive", "updatedAt");

-- AddForeignKey
ALTER TABLE "attendance_devices" ADD CONSTRAINT "attendance_devices_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
