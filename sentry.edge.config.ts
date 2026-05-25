import * as Sentry from "@sentry/nextjs";

// Edge runtime configuration for Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "",

  // Lower sample rate for edge functions due to cold starts
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

  environment: process.env.NODE_ENV,

  enabled: process.env.NODE_ENV === "production",

  // Minimal ignore list for edge
  ignoreErrors: [
    "NetworkError",
    "Failed to fetch",
    "TypeError: Failed to fetch",
  ],

  // Edge runtime specific
  beforeSend(event) {
    // Strip sensitive headers
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
    }
    return event;
  },

  // Disable attachments for edge
  attachStacktrace: false,
  sendDefaultPii: false,
});

export const onRequest = Sentry.wrapMiddlewareWithSentry;
