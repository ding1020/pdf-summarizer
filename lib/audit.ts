/**
 * Audit Log — records security-relevant operations for compliance & debugging.
 *
 * Events tracked:
 *   - auth: sign_up, sign_in, sign_out, password_reset, email_verify, token_refresh
 *   - payment: checkout_created, checkout_completed, subscription_granted,
 *              subscription_revoked, subscription_past_due
 *   - account: account_deleted, api_key_created, api_key_revoked
 *   - admin: payment_approved, payment_rejected
 *
 * Each event includes actor (userId), action, resource, details, and IP.
 */
import { prisma } from "./db";
import { logger } from "./logger";

export type AuditAction = string; // flexible, not enum-locked

export async function recordAudit(params: {
  userId?: string | null;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        resource: params.resource ?? null,
        resourceId: params.resourceId ?? null,
        details: params.details ? JSON.stringify(params.details) : null,
        ip: params.ip ?? null,
      },
    });
  } catch (err) {
    // Audit failure must not block the main operation — log and continue
    logger.error(
      "[audit] Failed to record audit log",
      err instanceof Error ? err : new Error(String(err)),
      { action: params.action, userId: params.userId },
    );
  }
}

export default { recordAudit };
