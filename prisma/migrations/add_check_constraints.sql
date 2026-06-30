-- Add CHECK constraints for data integrity at the DB level
-- Run this migration manually or via Prisma migrate

DO $$
BEGIN
  -- User constraints
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_subscription_status'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT chk_user_subscription_status
      CHECK ("subscriptionStatus" IN ('free', 'pro', 'pro_trial', 'past_due', 'canceled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_billing_cycle'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT chk_user_billing_cycle
      CHECK ("billingCycle" IS NULL OR "billingCycle" IN ('monthly', 'yearly'));
  END IF;

  -- Document constraints
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_document_status'
  ) THEN
    ALTER TABLE "Document" ADD CONSTRAINT chk_document_status
      CHECK ("status" IN ('processing', 'completed', 'failed'));
  END IF;

  -- Feedback constraints
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_feedback_status'
  ) THEN
    ALTER TABLE "Feedback" ADD CONSTRAINT chk_feedback_status
      CHECK ("status" IN ('open', 'in_progress', 'resolved', 'closed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_feedback_category'
  ) THEN
    ALTER TABLE "Feedback" ADD CONSTRAINT chk_feedback_category
      CHECK ("category" IN ('general', 'bug', 'feature', 'billing'));
  END IF;

  -- PaymentRequest constraints
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_status'
  ) THEN
    ALTER TABLE "PaymentRequest" ADD CONSTRAINT chk_payment_status
      CHECK ("status" IN ('pending', 'approved', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_plan'
  ) THEN
    ALTER TABLE "PaymentRequest" ADD CONSTRAINT chk_payment_plan
      CHECK ("plan" IN ('pro_monthly', 'pro_yearly'));
  END IF;
END $$;
