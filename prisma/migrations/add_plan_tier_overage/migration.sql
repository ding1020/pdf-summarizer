-- Add planTier and usageOverage columns to User table
-- These columns support usage-based billing (Pro+ plan tier and overage tracking)
-- Uses IF NOT EXISTS for idempotency (columns were initially added via runtime migration endpoint)

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "planTier" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "usageOverage" INTEGER NOT NULL DEFAULT 0;
