/**
 * Creem webhook handlers and helpers.
 * Extracted from the route handler to avoid Next.js 16 route type conflicts.
 */
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  sendEmail,
  paymentSuccessEmail,
  paymentFailedEmail,
  subscriptionCanceledEmail,
  adminPaymentFailureAlert,
} from "@/lib/email";
import { recordAudit } from "@/lib/audit";

// ── Signature verification (timing-safe) ──
export function verifySignature(
  payload: string,
  secret: string,
  signature: string,
): boolean {
  const normalized = signature.toLowerCase();
  if (!/^[a-f0-9]+$/.test(normalized) || normalized.length < 8) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const sigBuf = Buffer.from(normalized, "hex");

  if (expectedBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, sigBuf);
}

// ── Helpers ──
function extractUserId(metadata?: Record<string, unknown>): string | null {
  if (!metadata) return null;
  const ref = (
    metadata.userId ||
    metadata.referenceId ||
    metadata.internal_customer_id
  ) as string | undefined;
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
    logger.warn("Cannot send notification: no userId or email available", {
      userId,
      email,
      eventType,
    });
    return;
  }

  const endDateStr = extra?.endDate
    ? extra.endDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  const plan =
    extra?.billingCycle === "yearly" ? ("yearly" as const) : ("monthly" as const);

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
    logger.error(
      "Email notification failed",
      err instanceof Error ? err : new Error(String(err)),
      { eventType, userEmail },
    );
  }
}

async function updateUserPro(
  userId: string | null,
  email: string | null,
  opts: {
    sourceId?: string;
    productId?: string;
    billingCycle?: string | null;
    endDate?: Date | null;
    eventType: string;
  },
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
      logger.info(`✅ PRO granted [${opts.eventType}]`, {
        userId,
        sourceId: opts.sourceId,
      });

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
      logger.info(`✅ PRO granted by email [${opts.eventType}]`, {
        email,
        count: updated.count,
        sourceId: opts.sourceId,
      });
    }
  } catch (error) {
    logger.error(
      `Failed to grant PRO for ${userId || email}`,
      error instanceof Error ? error : new Error(String(error)),
    );
    Sentry.captureException(
      error instanceof Error ? error : new Error(String(error)),
      { tags: { eventType: opts.eventType }, extra: { userId, email } },
    );
  }
}

async function updateUserFree(
  userId: string | null,
  email: string | null,
  subId?: string,
) {
  try {
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: "free",
          subscriptionEndDate: new Date(),
          billingCycle: null,
        },
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
        data: {
          subscriptionStatus: "free",
          subscriptionEndDate: new Date(),
          billingCycle: null,
        },
      });
      logger.info(`❌ PRO revoked by email (canceled)`, { email, subId });
    }
  } catch (error) {
    logger.error(
      `Failed to revoke PRO for ${userId || email}`,
      error instanceof Error ? error : new Error(String(error)),
    );
    Sentry.captureException(
      error instanceof Error ? error : new Error(String(error)),
      { extra: { userId, email, subId } },
    );
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

  const period = product?.billing_period as string | undefined;
  const billingCycle =
    period === "every-year"
      ? "yearly"
      : period === "every-month"
        ? "monthly"
        : null;

  const endDateStr = sub.current_period_end_date as string | undefined;
  const endDate = endDateStr ? new Date(endDateStr) : null;

  await updateUserPro(userId ?? null, email ?? null, {
    sourceId: subId,
    productId,
    billingCycle,
    endDate,
    eventType: "subscription_paid",
  });

  await notifyUser(userId ?? null, email ?? null, "subscription.paid", {
    billingCycle,
    endDate,
  });
}

// ── Event type handlers ──
export const EVENT_HANDLERS: Record<
  string,
  (data: Record<string, unknown>) => Promise<void>
> = {
  async "subscription.paid"(data) {
    await handleSubscriptionGrant(data);
  },
  async "subscription.active"(data) {
    await handleSubscriptionGrant(data);
  },

  async "checkout.completed"(data) {
    const object = data.object as Record<string, unknown> | undefined;
    if (!object) return;

    const sub = object.subscription as Record<string, unknown> | undefined;
    if (sub?.id && !sub.canceled_at) {
      logger.info(
        "Checkout completed with active subscription, deferring to subscription event",
      );
      return;
    }

    const meta = (object.metadata || data.metadata) as
      | Record<string, unknown>
      | undefined;
    const customer = (object.customer || data.customer) as
      | Record<string, unknown>
      | undefined;

    const userId = extractUserId(meta);
    const email = customer?.email as string | undefined;

    if (!userId && !email) {
      logger.warn(
        "Cannot process checkout.completed: no userId or email found",
        { data },
      );
      Sentry.captureMessage(
        "Creem webhook: checkout.completed missing userId and email",
        "warning",
      );
      return;
    }

    await updateUserPro(userId ?? null, email ?? null, {
      sourceId: String(sub?.id ?? object.id),
      eventType: "checkout_completed",
    });

    const planBilling = (sub?.product as Record<string, unknown>)
      ?.billing_period as string | undefined;
    const cycle =
      planBilling === "every-year"
        ? "yearly"
        : planBilling === "every-month"
          ? "monthly"
          : null;
    const chkEnd = sub?.current_period_end_date as string | undefined;
    await notifyUser(userId ?? null, email ?? null, "checkout_completed", {
      billingCycle: cycle,
      endDate: chkEnd ? new Date(chkEnd) : null,
    });
  },

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
      Sentry.captureMessage(
        "Creem webhook: subscription.canceled missing userId and email",
        "warning",
      );
      return;
    }

    await updateUserFree(userId ?? null, email ?? null, subId);
    await notifyUser(userId ?? null, email ?? null, "subscription.canceled");
  },

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

    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      const userName =
        (customer?.name as string) || email?.split("@")[0] || "Unknown";
      const product = sub.product as Record<string, unknown> | undefined;
      const planLabel = (product?.name as string) || "PDFSum Pro";
      try {
        const alert = adminPaymentFailureAlert({
          userName,
          userEmail: email || "unknown",
          planLabel,
          reason:
            "Recurring payment failed — card may be expired or insufficient funds",
        });
        await sendEmail({
          to: adminEmail,
          subject: alert.subject,
          html: alert.html,
        });
      } catch (err) {
        logger.warn("Admin payment failure alert failed", {
          error: String(err),
        });
      }
    }
  },
};
