/**
 * Environment Variable Validation
 *
 * Checks required env vars at startup and throws descriptive errors
 * in production so missing configs are caught immediately, not during
 * a user request with a cryptic 500.
 */
import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";

// ── Define the expected shape ──
const envSchema = z.object({
  // Database (critical)
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required for database connection"),

  // Auth (critical)
  AUTH_SECRET: z
    .string()
    .min(16, "AUTH_SECRET must be at least 16 characters for JWT signing"),

  // AI (critical for core feature)
  DEEPSEEK_API_KEY: z.string().min(1, "DEEPSEEK_API_KEY is required for AI summarization"),

  // AI fallback providers (optional but recommended)
  GROQ_API_KEY: z.string().optional(),
  SILICONFLOW_API_KEY: z.string().optional(),

  // Redis / Upstash (optional — enables shared rate limiting & caching)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Email (important for password reset)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // Payments (important for monetization)
  CREEM_API_KEY: z.string().optional(),
  CREEM_SECRET_KEY: z.string().optional(),
  CREEM_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_CREEM_PRICE_MONTHLY: z.string().optional(),
  NEXT_PUBLIC_CREEM_PRICE_YEARLY: z.string().optional(),

  // App (important for correct URLs)
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .optional(),

  // Monitoring
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

// ── Validate and export ──
let validatedEnv: z.infer<typeof envSchema> | null = null;

export function validateEnv(): z.infer<typeof envSchema> {
  if (validatedEnv) return validatedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");

    const message = `\n❌ Missing required environment variables:\n${issues}\n\n` +
      `Please set these in Vercel → Settings → Environment Variables\n` +
      `or in your .env.local file for local development.\n`;

    if (isProduction) {
      // In production: fail fast with a clear message
      throw new Error(message);
    } else {
      // In development: warn but don't crash
      console.warn(message);
    }
  }

  validatedEnv = result.success ? result.data : null;
  return validatedEnv ?? ({} as z.infer<typeof envSchema>);
}

/**
 * Quick check: call this in any API route or page that needs env vars.
 * Returns parsed env or throws.
 */
export function getEnv(): z.infer<typeof envSchema> {
  return validateEnv();
}

export { envSchema };
