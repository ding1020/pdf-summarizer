/**
 * POST /api/cron/send-activation-reminder
 *
 * Cron endpoint: Sends a "try uploading" reminder to new users who
 * signed up 24h ago but haven't uploaded any document yet.
 *
 * Runs hourly. Protected by CRON_SECRET header.
 *
 * Targeting:
 *   - Created 24–25 hours ago (narrow window ensures one send per user)
 *   - No documents uploaded
 *   - Still on pro_trial (hasn't churned yet)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rateLimitAsync } from "@/lib/rate-limit";
import { sendEmail, activationReminderEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  // ── Auth (accept CRON_SECRET via Bearer token or x-vercel-cron-id header) ──
  const authHeader = req.headers.get("authorization") || "";
  const vercelCronId = req.headers.get("x-vercel-cron-id");

  if (process.env.CRON_SECRET) {
    const expected = `Bearer ${process.env.CRON_SECRET}`;
    if (authHeader !== expected && !vercelCronId) {
      logger.warn("Cron/activation-reminder: invalid or missing cron secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ── Rate limit ──
  const rateResult = await rateLimitAsync("cron:activation-reminder", {
    windowMs: 60_000,
    maxRequests: 1,
  });
  if (!rateResult.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);
  let sent = 0;

  try {
    // Find users who:
    // - Created between 24-25h ago (one-shot window for hourly cron)
    // - Are on pro_trial
    // - Have zero documents
    const candidates = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: twentyFiveHoursAgo,
          lt: twentyFourHoursAgo,
        },
        subscriptionStatus: "pro_trial",
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        _count: { select: { documents: true } },
      },
      take: 100,
    });

    // Filter to only users with no documents
    const inactiveUsers = candidates.filter((u: any) => u._count.documents === 0);

    for (const user of inactiveUsers) {
      const name = user.firstName || user.email.split("@")[0] || "there";
      try {
        const template = activationReminderEmail(name);
        await sendEmail({ to: user.email, ...template });
        sent++;
      } catch (err) {
        logger.warn("Activation reminder failed for user", {
          userId: user.id,
          email: user.email,
          error: String(err),
        });
      }
    }

    logger.info(`Cron/activation-reminder: Sent ${sent} activation reminders`, {
      candidates: candidates.length,
      inactive: inactiveUsers.length,
      sent,
    });

    return NextResponse.json({
      success: true,
      candidates: candidates.length,
      inactive: inactiveUsers.length,
      sent,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    logger.error(
      "Cron/activation-reminder: Failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
