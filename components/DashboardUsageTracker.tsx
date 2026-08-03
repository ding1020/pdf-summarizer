"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
// Lazy load NpsModal - only shown after 7 summaries
const NpsModal = dynamic(() => import("@/components/NpsModal"), {
  ssr: false,
});

/**
 * Tracks user's summary usage count by listening to "usage-refresh"
 * custom events dispatched by FileUpload after each completed summary.
 *
 * When usage count crosses the NPS threshold (7), shows the NPS modal.
 *
 * Also fetches initial count from /api/usage on mount.
 */
export default function DashboardUsageTracker() {
  const [usageCount, setUsageCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/usage");
      if (res.ok) {
        const data = await res.json();
        const count = data.count || data.usageCount || data.total || 0;
        setUsageCount((prev) => Math.max(prev, count));
      }
    } catch {
      // Silent
    }
  }, []);

  useEffect(() => {
    // Initial fetch on mount (use queueMicrotask to avoid sync setState in effect)
    queueMicrotask(() => {
      void fetchCount();
    });

    // Listen for custom "usage-refresh" events from FileUpload
    const handler = () => {
      // Increment optimistically, then sync from API
      setUsageCount((prev) => prev + 1);
      // Also attempt a real sync
      void fetchCount();
    };

    window.addEventListener("usage-refresh", handler);
    return () => window.removeEventListener("usage-refresh", handler);
  }, [fetchCount]);

  return <NpsModal usageCount={usageCount} />;
}
