import * as Sentry from "@sentry/nextjs";

// This file enables Sentry performance monitoring and error tracking
// It runs before your application starts

Sentry.init({
  // ... Sentry options
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Set environment
  environment: process.env.NODE_ENV,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production" && !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});

export const register = () => {
  // Server-side instrumentation
};

export const onRouteChange = () => {
  // Route change instrumentation for performance monitoring
};
