/**
 * POST /api/webhooks/creem
 *
 * Handles all Creem webhook events:
 * - subscription.paid    → auto-upgrade user to Pro
 * - subscription.canceled → downgrade to free
 * - subscription.past_due → mark past due
 * - checkout.completed   → handle one-time purchases
 *
 * Signature verification via HMAC-SHA256 of request body
 * using CREEM_WEBHOOK_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendEmail, paymentSuccessEmail, paymentFailedEmail, subscriptionCanceledEmail, adminPaymentFailureAlert } from "@/lib/email";
import { rateLimitAsync } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

// ── Signature verification (timing-safe) ──
function verifySignature(payload: string, secret: string, signature: string): boolean {
  // Validate signature is a valid hex string to prevent Buffer.from truncation
  if (!/^[a-f0-9]+$/i.test(signature) || signature.length < 8) return false;

  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const sigBuf = Buffer.from(signature, "hex");

  // Both must be same length for timingSafeEqual
  if (expectedBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, sigBuf);
}

// ── Event type handlers ──
const EVENT_HANDLERS: Record<string, (data: Record<string, unknown>) => Promise<void>> = {
  // ── Subscription activated / paid — GRANT PRO ACCESS ──
  async "subscription.paid"(data) {
    await handleSubscriptionGrant(data);
  },
  async "subscription.active"(data) {
    // Use for initial sync; prefer subscription.paid for granting access
    await handleSubscriptionGrant(data);
  },

  // ── Checkout completed (includes subscription info in payload) ──
  async "checkout.completed"(data) {
    const object = data.object as Record<string, unknown> | undefined;
    if (!object) return;

    // If this is a recurring order with a subscription, let the subscription event handle it
    const sub = object.subscription as Record<string, unknown> | undefined;
    if (sub?.id && !sub.canceled_at) {
      logger.info("Checkout completed with active subscription, deferring to subscription event");
      return;
    }

    // One-time purchase or fallback: grant via metadata userId
    const meta = (object.metadata || data.metadata) as Record<string, unknown> | undefined;
    const customer = (object.customer || data.customer) as Record<string, unknown> | undefined;

    const userId = extractUserId(meta);
    const email = customer?.email as string | undefined;

  if (!userId && !email) {
    logger.warn("Cannot process checkout.completed: no userId or email found", { data });
    Sentry.captureMessage("Creem webhook: checkout.completed missing userId and email", "warning");
    return;
  }

    await updateUserPro(userId ?? null, email ?? null, {
      sourceId: String(sub?.id ?? object.id),
      eventType: "checkout_completed",
    });

    // Notify user via email
    const planBilling = (sub?.product as Record<string, unknown>)?.billing_period as string | undefined;
    const cycle = planBilling === "every-year" ? "yearly" : planBilling === "every-month" ? "monthly" : null;
    const chkEnd = sub?.current_period_end_date as string | undefined;
    await notifyUser(userId ?? null, email ?? null, "checkout_completed", {
      billingCycle: cycle,
      endDate: chkEnd ? new Date(chkEnd) : null,
    });
  },

  // ── Subscription canceled — REVOKE PRO ACCESS ──
  async "subscription.canceled"(data) {
    const sub = data.object as Record<string, unknown> | undefined;
    if (!sub) return;

    const meta = sub.metadata as Record<string, unknown> | undefined;
    const customer = sub.customer as Record<string, unknown> | undefined;

    const userId = extractUserId(meta);
    const email = customer?.email as string | undefined;
    const subId = sub.id as string | undefined;

    if (!userId && !email) {
      logger.warn("Cannot revoke access: no userId or email", { subId });
      Sentry.captureMessage("Creem webhook: subscription.canceled missing userId and email", "warning");
      return;
    }

    await updateUserFree(userId ?? null, email ?? null, subId);

    // Notify user via email
    await notifyUser(userId ?? null, email ?? null, "subscription.canceled");
  },

  // ── Subscription payment failed ──
  async "subscription.past_due"(data) {
    const sub = data.object as Record<string, unknown> | undefined;
    if (!sub) return;

    const meta = sub.metadata as Record<string, unknown> | undefined;
    const customer = sub.customer as Record<string, unknown> | undefined;

    const userId = extractUserId(meta);
    const email = customer?.email as string | undefined;

    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { subscriptionStatus: "past_due" },
      });
      logger.info(`User ${userId} marked as past_due`);
      await notifyUser(userId, null, "subscription.past_due");
    } else if (email) {
      await prisma.user.updateMany({
        where: { email },
        data: { subscriptionStatus: "past_due" },
      });
      logger.info(`User by email ${email} marked as past_due`);
      await notifyUser(null, email, "subscription.past_due");
    }

    // ── Admin alert: notify admin about payment failure ──
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      const userName = (customer?.name as string) || email?.split("@")[0] || "Unknown";
      const product = sub.product as Record<string, unknown> | undefined;
      const planLabel = product?.name as string || "PDFSum Pro";
      try {
        const alert = adminPaymentFailureAlert({
          userName,
          userEmail: email || "unknown",
          planLabel,
          reason: "Recurring payment failed — card may be expired or insufficient funds",
        });
        await sendEmail({ to: adminEmail, subject: alert.subject, html: alert.html });
      } catch (err) {
        logger.warn("Admin payment failure alert failed", { error: String(err) });
      }
    }
  },
};

// ── Helpers ──
function extractUserId(metadata?: Record<string, unknown>): string | null {
  if (!metadata) return null;
  const ref = (metadata.userId || metadata.referenceId || metadata.internal_customer_id) as string | undefined;
  return ref ?? null;
}

async function notifyUser(
  userId: string | null,
  email: string | null,
  eventType: string,
  extra?: { billingCycle?: string | null; endDate?: Date | null },
) {
  let userEmail = email;
  let userName = "there";

  // Look up user info for name
  try {
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true },
      });
      if (user) {
        userEmail = user.email;
        userName = user.firstName || user.email.split("@")[0] || "there";
      }
    } else if (email) {
      userName = email.split("@")[0] || "there";
    }
  } catch (err) {
    logger.warn("Failed to look up user for email notification", { userId, email });
  }

  if (!userEmail) {
    logger.warn("Cannot send notification: no userId or email available", { userId, email, eventType });
    return;
  }

  const endDateStr = extra?.endDate
    ? extra.endDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "N/A";

  const plan = extra?.billingCycle === "yearly" ? "yearly" as const : "monthly" as const;

  try {
    if (eventType === "subscription.paid" || eventType === "checkout_completed") {
      const template = paymentSuccessEmail(userName, plan, endDateStr);
      await sendEmail({ to: userEmail, ...template });
    } else if (eventType === "subscription.past_due") {
      const template = paymentFailedEmail(userName);
      await sendEmail({ to: userEmail, ...template });
    } else if (eventType === "subscription.canceled") {
      const template = subscriptionCanceledEmail(userName);
      await sendEmail({ to: userEmail, ...template });
    }
  } catch (err) {
    logger.error("Email notification failed", err instanceof Error ? err : new Error(String(err)), { eventType, userEmail });
  }
}

async function handleSubscriptionGrant(data: Record<string, unknown>) {
  const sub = data.object as Record<string, unknown> | undefined;
  if (!sub) return;

  const meta = sub.metadata as Record<string, unknown> | undefined;
  const customer = sub.customer as Record<string, unknown> | undefined;
  const product = sub.product as Record<string, unknown> | undefined;

  const userId = extractUserId(meta);
  const email = customer?.email as string | undefined;
  const subId = sub.id as string | undefined;
  const productId = product?.id as string | undefined;

  // Determine billing cycle from product
  const period = product?.billing_period as string | undefined;
  const billingCycle =
    period === "every-year" ? "yearly" :
    period === "every-month" ? "monthly" : null;

  // Calculate end date from current_period_end_date
  const endDateStr = sub.current_period_end_date as string | undefined;
  const endDate = endDateStr ? new Date(endDateStr) : null;

  await updateUserPro(userId ?? null, email ?? null, {
    sourceId: subId,
    productId,
    billingCycle,
    endDate,
    eventType: "subscription_paid",
  });

  // Notify user via email
  await notifyUser(userId ?? null, email ?? null, "subscription.paid", { billingCycle, endDate });
}

async function updateUserPro(
  userId: string | null,
  email: string | null,
  opts: { sourceId?: string; productId?: string; billingCycle?: string | null; endDate?: Date | null; eventType: string },
) {
  try {
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: "pro",
          creemSubscriptionId: opts.sourceId,
          creemPriceId: opts.productId,
          billingCycle: opts.billingCycle ?? undefined,
          subscriptionEndDate: opts.endDate,
        },
      });
      logger.info(`✅ PRO granted [${opts.eventType}]`, { userId, sourceId: opts.sourceId });

      await recordAudit({
        userId,
        action: "subscription_granted",
        resource: "User",
        resourceId: userId,
        details: {
          sourceId: opts.sourceId,
          productId: opts.productId,
          billingCycle: opts.billingCycle,
          endDate: opts.endDate?.toISOString(),
          eventType: opts.eventType,
        },
      });
    } else if (email) {
      const updated = await prisma.user.updateMany({
        where: { email },
        data: {
          subscriptionStatus: "pro",
          creemSubscriptionId: opts.sourceId,
          creemPriceId: opts.productId,
          billingCycle: opts.billingCycle ?? undefined,
          subscriptionEndDate: opts.endDate,
        },
      });
      logger.info(`✅ PRO granted by email [${opts.eventType}]`, { email, count: updated.count, sourceId: opts.sourceId });
    }
  } catch (error) {
    logger.error(`Failed to grant PRO for ${userId || email}`, error instanceof Error ? error : new Error(String(error)));
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { eventType: opts.eventType },
      extra: { userId, email },
    });
  }
}

async function updateUserFree(userId: string | null, email: string | null, subId?: string) {
  try {
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { subscriptionStatus: "free", subscriptionEndDate: new Date(), billingCycle: null },
      });
      logger.info(`❌ PRO revoked (canceled)`, { userId, subId });

      await recordAudit({
        userId,
        action: "subscription_revoked",
        resource: "User",
        resourceId: userId,
        details: { subId, reason: "canceled" },
      });
    } else if (email) {
      await prisma.user.updateMany({
        where: { email },
        data: { subscriptionStatus: "free", subscriptionEndDate: new Date(), billingCycle: null },
      });
      logger.info(`❌ PRO revoked by email (canceled)`, { email, subId });
    }
  } catch (error) {
    logger.error(`Failed to revoke PRO for ${userId || email}`, error instanceof Error ? error : new Error(String(error)));
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      extra: { userId, email, subId },
    });
  }
}

// ── Main handler ──
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CREEM_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error("CREEM_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // ── Rate limiting: 30 req/min per IP (prevent malicious replay) ──
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const rateResult = await rateLimitAsync(`webhook:${ip}`, {
    windowMs: 60_000,
    maxRequests: 30,
  });
  if (!rateResult.success) {
    logger.warn("Webhook rate limit exceeded", { ip });
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Get raw body for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get("creem-signature") || "";

  if (!verifySignature(rawBody, webhookSecret, signature)) {
    logger.warn("Invalid webhook signature", { hasSignature: !!signature });
    Sentry.captureMessage("Creem webhook: invalid signature", "warning");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse payload
  let payload: { eventType?: string; id?: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.eventType;
  const eventId = payload.id;

  if (!eventId) {
    logger.warn("Webhook received without event ID", { eventType });
    return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
  }

  logger.info(`📥 Webhook received`, { eventId, eventType });

  // ── Idempotency: atomically insert BEFORE processing (prevents race condition) ──
  // Strategy: INSERT first as a distributed lock. If INSERT fails with unique
  // constraint → duplicate, skip. If INSERT succeeds → we own this event.
  // On handler failure, DELETE the record so Creem can retry.
  try {
    await prisma.processedWebhook.create({
      data: { id: eventId, eventType: eventType || "unknown" },
    });
  } catch (dbErr: unknown) {
    const code = (dbErr as { code?: string })?.code;
    if (code === "P2002") {
      // Prisma unique constraint violation → already processed
      logger.info("Duplicate webhook skipped (idempotent)", { eventId, eventType });
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Other DB error → fail open rather than blocking payments
    logger.warn("Failed to claim webhook idempotency slot, proceeding anyway", {
      error: dbErr instanceof Error ? dbErr.message : String(dbErr),
    });
  }

  // Find handler
  const handler = EVENT_HANDLERS[eventType || ""];
  if (!handler) {
    logger.info(`Unhandled event type: ${eventType}`, { eventId });
    return NextResponse.json({ received: true });
  }

  // Process
  try {
    await handler(payload);
  } catch (error) {
    // On failure, delete idempotency record so Creem can retry
    try {
      await prisma.processedWebhook.delete({ where: { id: eventId } });
    } catch (_) {
      // Best effort cleanup
    }
    logger.error(`Webhook handler failed for ${eventType}`, error instanceof Error ? error : new Error(String(error)), { eventId });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true, processed: true });
}
