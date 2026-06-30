/**
 * POST /api/cron/send-winback
 *
 * Cron endpoint: Sends win-back emails to users who were previously
 * Pro/Trial but are now inactive on the Free plan.
 *
 * Targeting:
 *   - Status: free (downgraded from pro/pro_trial)
 *   - Inactive: lastActiveAt between 3–14 days ago
 *   - Not already contacted: no win-back email in last 30 days
 *
 * Protected by CRON_SECRET header. Rate limited to 1 req/min.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rateLimitAsync } from "@/lib/rate-limit";
import { sendEmail, winBackEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  // ── Auth ──
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    logger.warn("Cron/send-winback: invalid or missing x-cron-secret");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Rate limit ──
  const rateResult = await rateLimitAsync("cron:winback", {
    windowMs: 60_000,
    maxRequests: 1,
  });
  if (!rateResult.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  let sent = 0;

  try {
    // Find users who:
    // - Are free now (downgraded)
    // - Have a subscriptionEndDate in the past (were once pro/trial)
    // - inactive 3–14 days
    // - No win-back email in last 30 days
    // NOTE: Uses new schema fields (lastActiveAt, lastWinBackSentAt) —
    // TS types may lag until prisma generate is re-run after migration.
    const db = prisma as any;
    const candidates = await db.user.findMany({
      where: {
        subscriptionStatus: "free",
        subscriptionEndDate: { not: null, lt: now },
        lastActiveAt: {
          gte: fourteenDaysAgo,
          lt: threeDaysAgo,
        },
        OR: [
          { lastWinBackSentAt: null },
          { lastWinBackSentAt: { lt: thirtyDaysAgo } },
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastActiveAt: true,
        subscriptionEndDate: true,
      },
      take: 50,
    });

    for (const user of candidates) {
      const name = user.firstName || user.email.split("@")[0] || "there";
      try {
        const template = winBackEmail(name);
        await sendEmail({ to: user.email, ...template });

        // Update lastWinBackSentAt to prevent duplicate sends
        await db.user.update({
          where: { id: user.id },
          data: { lastWinBackSentAt: now },
        });

        sent++;
      } catch (err) {
        logger.warn("Win-back email failed for user", {
          userId: user.id,
          email: user.email,
          error: String(err),
        });
      }
    }

    logger.info(`Cron/send-winback: Sent ${sent} win-back emails`, {
      candidates: candidates.length,
      sent,
    });

    return NextResponse.json({
      success: true,
      candidates: candidates.length,
      sent,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    logger.error(
      "Cron/send-winback: Failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
