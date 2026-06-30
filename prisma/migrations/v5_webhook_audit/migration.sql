-- Add ProcessedWebhook and AuditLog tables
-- Run as part of Prisma migrate or manually

-- ProcessedWebhook: ensures webhook idempotency
CREATE TABLE IF NOT EXISTS "ProcessedWebhook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ProcessedWebhook_processedAt_idx" ON "ProcessedWebhook"("processedAt");

-- AuditLog: tracks security-relevant operations
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "details" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- Cleanup: delete processed webhooks older than 30 days (idempotency only needs recent)
-- Run this periodically or add to cron
-- DELETE FROM "ProcessedWebhook" WHERE "processedAt" < NOW() - INTERVAL '30 days';
