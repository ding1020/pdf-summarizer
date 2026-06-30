// Sentry client-side configuration
// Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Set environment
  environment: process.env.NODE_ENV || "development",

  // Ignore common false positives
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection",
  ],

  beforeSend(event) {
    // Drop events from bots / crawlers
    const ua = navigator.userAgent;
    if (ua && /bot|crawler|spider|curl/i.test(ua)) return null;
    return event;
  },
});

// Instrument router transitions for performance monitoring
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
