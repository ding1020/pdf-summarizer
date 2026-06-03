// Sentry server-side configuration
// This file is used by the Next.js server runtime (API routes, server components)

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring — lower rate for server to control costs
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Environment
  environment: process.env.NODE_ENV || "development",

  // Enable HTTP breadcrumbs for API debugging
  maxBreadcrumbs: 100,

  beforeSend(event) {
    // Don't send events in development (unless explicitly wanted)
    if (process.env.NODE_ENV === "development") return null;
    return event;
  },
});
