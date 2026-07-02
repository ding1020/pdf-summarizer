import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/get-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin check
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user || user.email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Auth error" }, { status: 500 });
  }

  try {
    const now = new Date();
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
    const startOfWeek = new Date(startOfToday.getTime() - 6 * 86400000);
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );

    // ── Today's stats ──
    const [todayStats, yesterdayStats, weekDaily, totalStats, recentCalls, providerBreakdown] =
      await Promise.all([
        // Today aggregate
        prisma.usageLog.aggregate({
          where: { createdAt: { gte: startOfToday } },
          _count: { id: true },
          _sum: { totalTokens: true, inputTokens: true, outputTokens: true, costUSD: true },
        }),
        // Yesterday aggregate (for comparison)
        prisma.usageLog.aggregate({
          where: {
            createdAt: { gte: startOfYesterday, lt: startOfToday },
          },
          _count: { id: true },
          _sum: { totalTokens: true, costUSD: true },
        }),
        // Last 7 days daily breakdown
        (async () => {
          const results: Array<{
            date: string;
            calls: number;
            tokens: number;
            cost: number;
          }> = [];
          for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(startOfToday.getTime() - i * 86400000);
            const dayEnd = new Date(dayStart.getTime() + 86400000);
            const dayData = await prisma.usageLog.aggregate({
              where: { createdAt: { gte: dayStart, lt: dayEnd } },
              _count: { id: true },
              _sum: { totalTokens: true, costUSD: true },
            });
            results.push({
              date: dayStart.toISOString().slice(0, 10),
              calls: dayData._count.id,
              tokens: dayData._sum.totalTokens ?? 0,
              cost: Math.round((dayData._sum.costUSD ?? 0) * 10000) / 10000,
            });
          }
          return results;
        })(),
        // All-time totals
        prisma.usageLog.aggregate({
          _count: { id: true },
          _sum: { totalTokens: true, costUSD: true },
          _max: { createdAt: true },
        }),
        // Recent calls (last 20)
        prisma.usageLog.findMany({
          take: 20,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            provider: true,
            model: true,
            totalTokens: true,
            costUSD: true,
            userType: true,
            route: true,
            createdAt: true,
          },
        }),
        // Provider breakdown
        prisma.usageLog.groupBy({
          by: ["provider"],
          where: { createdAt: { gte: startOfMonth } },
          _count: { id: true },
          _sum: { totalTokens: true, costUSD: true },
        }),
      ]);

    // ── User counts ──
    const [totalUsers, proUsers, freeUsers, todayActiveUsers, totalDocuments] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { subscriptionStatus: "pro" } }),
      prisma.user.count({ where: { subscriptionStatus: "free" } }),
      prisma.usageLog
        .groupBy({ by: ["userId"], where: { createdAt: { gte: startOfToday } }, _count: true })
        .then((g) => g.length),
      prisma.document.count(),
    ]);

    // ── Today's unique users ──
    const todayMetrics = {
      calls: todayStats._count.id,
      tokens: todayStats._sum.totalTokens ?? 0,
      inputTokens: todayStats._sum.inputTokens ?? 0,
      outputTokens: todayStats._sum.outputTokens ?? 0,
      cost: Math.round((todayStats._sum.costUSD ?? 0) * 10000) / 10000,
      uniqueUsers: todayActiveUsers,
    };

    const yesterdayMetrics = {
      calls: yesterdayStats._count.id,
      tokens: yesterdayStats._sum.totalTokens ?? 0,
      cost: Math.round((yesterdayStats._sum.costUSD ?? 0) * 10000) / 10000,
    };

    return NextResponse.json({
      today: todayMetrics,
      yesterday: yesterdayMetrics,
      week: weekDaily,
      totals: {
        calls: totalStats._count.id,
        tokens: totalStats._sum.totalTokens ?? 0,
        cost: Math.round((totalStats._sum.costUSD ?? 0) * 10000) / 10000,
        firstRecorded: totalStats._max.createdAt ?? null,
      },
      users: { total: totalUsers, pro: proUsers, free: freeUsers },
      documents: totalDocuments,
      recentCalls,
      providerBreakdown: providerBreakdown.map((p) => ({
        provider: p.provider,
        calls: p._count.id,
        tokens: p._sum.totalTokens ?? 0,
        cost: Math.round((p._sum.costUSD ?? 0) * 10000) / 10000,
      })),
    });
  } catch (error) {
    logger.error("Admin stats error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
