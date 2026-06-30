-- Add trial usage and win-back engagement fields
-- Safe additive migration — no existing data affected

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialUsageTotal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastWinBackSentAt" TIMESTAMP(3);

-- Index for win-back cron queries (find inactive users efficiently)
CREATE INDEX IF NOT EXISTS "User_lastActiveAt_idx" ON "User"("lastActiveAt");
CREATE INDEX IF NOT EXISTS "User_lastWinBackSentAt_idx" ON "User"("lastWinBackSentAt");
