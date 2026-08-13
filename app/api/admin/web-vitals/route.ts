/**
 * GET /api/admin/web-vitals
 *
 * Returns aggregated Web Vitals data for the admin dashboard.
 * Provides P75/P95 percentiles and rating breakdowns for each metric.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUserId } from "@/lib/get-auth";

const METRICS = ["LCP", "CLS", "INP", "TTFB", "FCP"] as const;
const DAYS = 7;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

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
  since.setDate(since.getDate() - DAYS);

  const records = await prisma.webVital.findMany({
    where: { createdAt: { gte: since } },
    select: { metric: true, value: true, rating: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const result = METRICS.map((metric) => {
    const values = records.filter((r) => r.metric === metric).map((r) => r.value).sort((a, b) => a - b);
    const good = records.filter((r) => r.metric === metric && r.rating === "good").length;
    const needsImprovement = records.filter((r) => r.metric === metric && r.rating === "needs-improvement").length;
    const poor = records.filter((r) => r.metric === metric && r.rating === "poor").length;

    // Daily breakdown for trend chart
    const dailyData: Array<{ date: string; p75: number; count: number }> = [];
    for (let d = DAYS - 1; d >= 0; d--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayValues = records
        .filter((r) => r.metric === metric && r.createdAt >= dayStart && r.createdAt < dayEnd)
        .map((r) => r.value)
        .sort((a, b) => a - b);

      dailyData.push({
        date: dayStart.toISOString().slice(0, 10),
        p75: percentile(dayValues, 75),
        count: dayValues.length,
      });
    }

    return {
      metric,
      count: values.length,
      p50: percentile(values, 50),
      p75: percentile(values, 75),
      p95: percentile(values, 95),
      ratingBreakdown: { good, needsImprovement, poor },
      daily: dailyData,
    };
  });

  return NextResponse.json({
    metrics: result,
    totalRecords: records.length,
    since: since.toISOString(),
  });
}