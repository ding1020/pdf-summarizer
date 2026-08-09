-- Add tokenVersion column to User table for DB-based token revocation.
--
-- When a user's tokenVersion is incremented (e.g. on password change or
-- explicit "revoke all sessions"), all previously-issued auth tokens whose
-- embedded `ver` field no longer matches will be rejected by
-- verifyTokenWithRevocation().
--
-- Existing users default to 1, matching the default used by createToken()
-- when tokenVersion is not provided.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 1;
