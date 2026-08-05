/**
 * POST /api/web-vitals
 *
 * Receives Core Web Vitals metrics (LCP, FID, CLS, INP, TTFB, FCP)
 * from the client-side WebVitals component.
 *
 * Metrics are logged server-side for monitoring and sent to Sentry
 * for poor-rated values. No PII is stored — only pathname and metric data.
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

// Supported metric names (whitelist for validation)
const SUPPORTED_METRICS = new Set([
  "LCP",   // Largest Contentful Paint
  "FID",   // First Input Delay (legacy)
  "CLS",   // Cumulative Layout Shift
  "INP",   // Interaction to Next Paint
  "TTFB",  // Time to First Byte
  "FCP",   // First Contentful Paint
]);

export async function POST(req: NextRequest) {
  try {
    // Handle Blob (sendBeacon) or JSON body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    const { name, value, rating, id, delta, navigationType, pathname } = body;

    // Validate metric name
    if (typeof name !== "string" || !SUPPORTED_METRICS.has(name)) {
      return NextResponse.json({ ok: false, error: "Unsupported metric" }, { status: 400 });
    }

    // Validate value is a number
    if (typeof value !== "number" || !isFinite(value)) {
      return NextResponse.json({ ok: false, error: "Invalid value" }, { status: 400 });
    }

    // Log metric for server-side monitoring
    const logLevel = rating === "poor" ? "warn" : rating === "needs-improvement" ? "info" : "debug";

    logger[logLevel](`[Web Vitals] ${name}: ${value} (${rating})`, {
      metric: name,
      value,
      rating,
      metricId: id,
      delta: typeof delta === "number" ? delta : 0,
      navigationType: typeof navigationType === "string" ? navigationType : "unknown",
      pathname: typeof pathname === "string" ? pathname : "/",
    });

    // Send poor metrics to Sentry for proactive alerting
    if (rating === "poor") {
      Sentry.captureMessage(
        `Poor Web Vital: ${name} = ${value} on ${pathname}`,
        "warning",
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logger.error(
      "[Web Vitals] Failed to process metric",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
