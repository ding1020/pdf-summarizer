/**
 * Sentry instrumentation for Next.js
 * Registers error handlers and sets up the SDK for server-side tracking.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    await import("./sentry.edge.config");
  }
}
