/**
 * GET /api/admin/errors
 *
 * Returns recent error information for the admin dashboard.
 * Sources: AuditLog entries with error-related actions, UsageLog with error status.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUserId } from "@/lib/get-auth";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!user || (user.firstName !== "ding" && user.lastName !== "1020")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const since = new Date();
  since.setDate(since.getDate() - 7);

  // Get error usage logs
  const [errorLogs, auditErrors] = await Promise.all([
    prisma.usageLog.findMany({
      where: { status: "error", createdAt: { gte: since } },
      take: 50,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        provider: true,
        model: true,
        route: true,
        ip: true,
        createdAt: true,
        userId: true,
      },
    }),
    prisma.auditLog.findMany({
      where: { action: { contains: "error" }, createdAt: { gte: since } },
      take: 50,
      orderBy: { createdAt: "desc" },
      select: { id: true, action: true, resource: true, details: true, ip: true, createdAt: true },
    }),
  ]);

  // Aggregate by day for trend
  const dailyErrors: Array<{ date: string; count: number }> = [];
  for (let d = 6; d >= 0; d--) {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const count = errorLogs.filter(
      (e) => e.createdAt >= dayStart && e.createdAt < dayEnd,
    ).length;

    dailyErrors.push({
      date: dayStart.toISOString().slice(0, 10),
      count,
    });
  }

  // Group by provider
  const byProvider = errorLogs.reduce((acc, log) => {
    acc[log.provider] = (acc[log.provider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return NextResponse.json({
    totalErrors: errorLogs.length,
    recentErrors: errorLogs.slice(0, 20),
    auditErrors: auditErrors.slice(0, 10),
    daily: dailyErrors,
    byProvider,
    sentryEnabled: !!process.env.SENTRY_DSN,
  });
}