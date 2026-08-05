"use client";

import { useReportWebVitals } from "next/web-vitals";


/**
 * Web Vitals Monitor
 *
 * Reports Core Web Vitals (LCP, FID, CLS, INP, TTFB, FCP) to:
 * 1. /api/web-vitals — server-side logging for trend analysis
 * 2. Sentry — for performance monitoring (if configured)
 * 3. Vercel Analytics — automatically via @vercel/analytics
 *
 * This component has no visual output — it only collects metrics.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    const body = {
      name: metric.name,
      value: Math.round(metric.value * 100) / 100,
      rating: metric.rating,
      id: metric.id,
      delta: metric.delta ? Math.round(metric.delta * 100) / 100 : 0,
      navigationType: metric.navigationType,
      pathname: typeof window !== "undefined" ? window.location.pathname : "/",
      timestamp: Date.now(),
    };

    // Send to server endpoint (beacon API for non-blocking)
    try {
      const blob = new Blob([JSON.stringify(body)], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/web-vitals", blob);
    } catch {
      fetch("/api/web-vitals", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }

    // Log warnings for poor metrics
    if (metric.rating === "poor") {
      console.warn(`[Web Vitals] Poor ${metric.name}: ${metric.value}`, {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        pathname: body.pathname,
      });
    }
  });

  return null;
}
