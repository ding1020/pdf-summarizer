/**
 * POST /api/cron/downgrade-expired
 *
 * Cron endpoint: Checks for users whose subscriptionEndDate has passed
 * and downgrades them to free. Call every hour via Vercel Cron Jobs or
 * external scheduler (e.g., cron-job.org).
 *
 * Protected by CRON_SECRET header.
 *
 * Rate limit: 1 req/min to prevent abuse.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rateLimitAsync } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import { sendEmail, trialExpiringEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  // ── Auth ──
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    logger.warn("Cron: invalid or missing x-cron-secret");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Rate limit ──
  const rateResult = await rateLimitAsync("cron:downgrade", {
    windowMs: 60_000,
    maxRequests: 1,
  });
  if (!rateResult.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const now = new Date();
  let downgradedCount = 0;
  let auditCleanedCount = 0;
  let webhookCleanedCount = 0;
  let trialReminderCount = 0;

  try {
    // ── 1. Downgrade expired PRO & TRIAL subscriptions ──
    const expiredUsers = await prisma.user.findMany({
      where: {
        subscriptionStatus: { in: ["pro", "pro_trial"] },
        subscriptionEndDate: { lt: now },
      },
      select: { id: true, email: true, subscriptionEndDate: true, subscriptionStatus: true },
    });

    const ids = expiredUsers.map((u) => u.id);
    if (ids.length > 0) {
      // Re-check subscriptionEndDate at update time to prevent race with
      // concurrent webhook renewals (user renews between findMany and updateMany)
      const result = await prisma.user.updateMany({
        where: { id: { in: ids }, subscriptionStatus: { in: ["pro", "pro_trial"] }, subscriptionEndDate: { lt: now } },
        data: {
          subscriptionStatus: "free",
          billingCycle: null,
          subscriptionEndDate: null,
        },
      });
      downgradedCount = result.count;

      for (const user of expiredUsers) {
        const isTrial = user.subscriptionStatus === "pro_trial";
        await recordAudit({
          userId: user.id,
          action: isTrial ? "trial_expired" : "subscription_expired",
          resource: "User",
          resourceId: user.id,
          details: {
            email: user.email,
            expiredAt: user.subscriptionEndDate?.toISOString(),
            downgradedAt: now.toISOString(),
            wasTrial: isTrial,
          },
        });
      }

      logger.info(`Cron: Downgraded ${downgradedCount} expired subscriptions`, {
        expiredCount: expiredUsers.length,
        downgradedCount,
        trialCount: expiredUsers.filter(u => u.subscriptionStatus === "pro_trial").length,
      });
    } else {
      logger.info("Cron: No expired PRO subscriptions found");
    }

    // ── 1.5. Send trial-expiring reminders (trial ends within 24h) ──
    const reminderThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    try {
      const expiringTrials = await prisma.user.findMany({
        where: {
          subscriptionStatus: "pro_trial",
          subscriptionEndDate: { gt: now, lt: reminderThreshold },
        },
        select: { id: true, email: true, firstName: true, subscriptionEndDate: true },
      });

      for (const user of expiringTrials) {
        const name = user.firstName || user.email.split("@")[0] || "there";
        const hoursLeft = Math.max(1, Math.round((user.subscriptionEndDate!.getTime() - now.getTime()) / (3600 * 1000)));
        const daysLeft = Math.max(1, Math.ceil(hoursLeft / 24));

        try {
          const template = trialExpiringEmail(name, daysLeft);
          await sendEmail({ to: user.email, subject: template.subject, html: template.html });
          trialReminderCount++;
        } catch (err) {
          logger.warn("Failed to send trial reminder", { email: user.email, error: String(err) });
        }
      }

      if (expiringTrials.length > 0) {
        logger.info(`Cron: Sent ${trialReminderCount} trial-expiring reminders`, {
          total: expiringTrials.length,
          sent: trialReminderCount,
        });
      }
    } catch (err) {
      logger.warn("Cron: Failed to process trial reminders", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // ── 2. Clean up stale audit logs (keep last 90 days) ──
    const auditRetention = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    try {
      const result = await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: auditRetention } },
      });
      auditCleanedCount = result.count;
      if (auditCleanedCount > 0) {
        logger.info(`Cron: Cleaned ${auditCleanedCount} audit logs older than 90 days`);
      }
    } catch (err) {
      logger.warn("Cron: Failed to clean old audit logs", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // ── 3. Clean up stale webhook records (keep last 30 days) ──
    const webhookRetention = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    try {
      const result = await prisma.processedWebhook.deleteMany({
        where: { processedAt: { lt: webhookRetention } },
      });
      webhookCleanedCount = result.count;
      if (webhookCleanedCount > 0) {
        logger.info(`Cron: Cleaned ${webhookCleanedCount} webhook records older than 30 days`);
      }
    } catch (err) {
      logger.warn("Cron: Failed to clean old webhook records", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return NextResponse.json({
      success: true,
      expiredFound: expiredUsers.length,
      downgraded: downgradedCount,
      trialRemindersSent: trialReminderCount,
      auditCleaned: auditCleanedCount,
      webhookCleaned: webhookCleanedCount,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    logger.error(
      "Cron: Failed to downgrade expired subscriptions",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Also support GET for simple health-check-style cron
export async function GET(req: NextRequest) {
  return POST(req);
}
