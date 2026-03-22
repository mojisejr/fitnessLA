-- AlterTable
ALTER TABLE "user" ADD COLUMN     "allowedMachineIp" TEXT,
ADD COLUMN     "scheduledEndTime" TEXT,
ADD COLUMN     "scheduledStartTime" TEXT;

-- CreateTable
CREATE TABLE "staff_attendance_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "scheduledStartTime" TEXT,
    "scheduledEndTime" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "arrivalStatus" TEXT NOT NULL DEFAULT 'UNSCHEDULED',
    "departureStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyArrivalMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyLeaveMinutes" INTEGER NOT NULL DEFAULT 0,
    "machineIp" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_attendance_logs_workDate_idx" ON "staff_attendance_logs"("workDate");

-- CreateIndex
CREATE UNIQUE INDEX "staff_attendance_logs_userId_workDate_key" ON "staff_attendance_logs"("userId", "workDate");

-- AddForeignKey
ALTER TABLE "staff_attendance_logs" ADD CONSTRAINT "staff_attendance_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
