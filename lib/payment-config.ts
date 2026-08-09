/**
 * Payment channel configuration.
 *
 * Centralized feature flags for payment methods so they can be toggled
 * purely via environment variables — no code changes required.
 */

/**
 * Manual payment channels (Alipay / WeChat Pay) feature flag.
 *
 * These channels rely on QR-code payment + manual admin verification and are
 * primarily intended for the Chinese market. Set `ENABLE_MANUAL_PAYMENT=true`
 * in the environment to expose them on the pricing page and accept
 * submission requests. Disabled by default — leave unset (or set to anything
 * other than "true") for international-only deployments where only the Creem
 * card checkout should be available.
 *
 * NOTE: This is a server-side read of a non-public env var. To gate client UI,
 * pass the resolved boolean down from a Server Component as a prop rather than
 * importing this constant directly into Client Components (the value would be
 * inlined as `false` on the client since the env var is not exposed).
 */
export const MANUAL_PAYMENT_ENABLED =
  process.env.ENABLE_MANUAL_PAYMENT === "true";
