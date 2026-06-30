-- Add composite index for AuditLog queries filtering by action + date range
-- Improves audit dashboard and retention cleanup performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_action_createdat'
  ) THEN
    CREATE INDEX "idx_audit_action_createdat" ON "AuditLog" ("action", "createdAt" DESC);
  END IF;
END $$;
