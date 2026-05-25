import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Set environment
  environment: process.env.NODE_ENV,

  // Enable debug mode in development
  debug: process.env.NODE_ENV !== "production",

  // Session replay settings
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  // Only capture sessions in production
  enabled: process.env.NODE_ENV === "production",

  // Ignore common errors that are handled by our app
  ignoreErrors: [
    "NetworkError",
    "Failed to fetch",
    "Network request failed",
    "cancel",
    "Extension context invalidated",
  ],

  // Spotlight for local development
  spotlight: process.env.NODE_ENV === "development",

  // Customize the server-side data collection
  beforeSend(event) {
    // Filter out sensitive data
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
      delete event.request.headers["x-api-key"];
    }

    // Add custom context
    if (event.tags) {
      event.tags.appVersion = process.env.npm_package_version || "1.0.0";
      event.tags.region = process.env.VERCEL_REGION || "unknown";
    }

    return event;
  },

  // Additional options
  maxBreadcrumbs: 50,
  attachStacktrace: true,
  sendDefaultPii: false,
});
