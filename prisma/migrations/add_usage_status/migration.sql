-- AlterTable
ALTER TABLE "UsageLog" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'success';

-- CreateIndex
CREATE INDEX "UsageLog_status_idx" ON "UsageLog"("status");
