import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ALERT_RULES, checkAlert } from "@/lib/alerts";
import { sendAlertNotification } from "@/lib/alerts-webhook";

/**
 * GET /api/cron/alerts
 * Called by Vercel Cron every 5 minutes to check alert conditions.
 * Protected by CRON_SECRET header.
 */
export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await checkAllAlerts();
    return NextResponse.json({
      checked: results.length,
      fired: results.filter((r) => r.fired).length,
      results,
    });
  } catch {
    return NextResponse.json({ error: "Failed to check alerts" }, { status: 500 });
  }
}

async function checkAllAlerts() {
  const results: Array<{ ruleId: string; name: string; fired: boolean; current: number }> = [];

  // Get metrics for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // 1. Error rate (from usage logs with error status)
  const todayCalls = await prisma.usageLog.count({
    where: { createdAt: { gte: today } },
  });
  // Simulate error count (would need error tracking table)
  const errorRate = todayCalls > 0 ? 0.01 : 0; // 1% assumed for demo

  // 2. Conversion rate
  const newUsersToday = await prisma.user.count({
    where: { createdAt: { gte: today } },
  });
  const newProToday = await prisma.user.count({
    where: {
      createdAt: { gte: today },
      subscriptionStatus: { in: ["pro", "pro_trial"] },
    },
  });
  const conversionRate = newUsersToday > 0 ? newProToday / newUsersToday : 0;

  // 3. AI cost today
  const costResult = await prisma.usageLog.aggregate({
    where: { createdAt: { gte: today } },
    _sum: { costUSD: true },
  });
  const aiCostDaily = costResult._sum.costUSD || 0;

  // 4. Payment failure rate
  const paymentsToday = await prisma.paymentRequest.count({
    where: { createdAt: { gte: today } },
  });
  const failedPayments = await prisma.paymentRequest.count({
    where: { createdAt: { gte: today }, status: "rejected" },
  });
  const paymentFailureRate = paymentsToday > 0 ? failedPayments / paymentsToday : 0;

  const metrics: Record<string, number> = {
    "api.error_rate": errorRate,
    "business.conversion_rate": conversionRate,
    "cost.ai_daily": aiCostDaily,
    "payment.failure_rate": paymentFailureRate,
    "business.signups_daily": newUsersToday,
  };

  for (const rule of ALERT_RULES) {
    const value = metrics[rule.metric] ?? 0;
    const fired = checkAlert(rule, value);

    if (fired) {
      await sendAlertNotification({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        metric: rule.metric,
        current: value,
        threshold: rule.threshold,
        message: `${rule.name}: ${rule.metric} = ${value.toFixed(4)} (threshold: ${rule.threshold})`,
      });
    }

    results.push({ ruleId: rule.id, name: rule.name, fired, current: value });
  }

  return results;
}
