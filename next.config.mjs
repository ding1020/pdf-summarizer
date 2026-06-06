import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // pdf-parse must be bundled as server external
  serverExternalPackages: ["pdf-parse"],

  // ⚡ Performance
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // 🔒 Security headers
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.pdfsum.com https://*.clerk.accounts.dev",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://img.clerk.com",
      "font-src 'self' data:",
      "connect-src 'self' https://api.deepseek.com https://api.groq.com https://api.siliconflow.cn https://clerk.pdfsum.com https://*.clerk.accounts.dev https://api.paddle.com https://sandbox-api.paddle.com",
      "frame-src https://*.clerk.accounts.dev https://checkout.paddle.com https://sandbox-checkout.paddle.com",
      "media-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // X-XSS-Protection removed — CSP with 'unsafe-inline' handles XSS; this header is deprecated
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },

  // ⏱️ ISR: enable for static-ish pages via Route Segment Config
  // Pages like /pricing and /help can revalidate every 3600s

  // 📸 Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400, // 1 day
  },

  // 📦 Transpile external packages — handled by next-intl plugin via createNextIntlPlugin
};

// ── Sentry configuration ──
const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
};

const sentryOptions = {
  widenClientFileUpload: true,
  transpileClientSDK: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
};

// Export with Sentry wrapping (source maps + release tracking)
const configWithSentry = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions, sentryOptions)
  : nextConfig;

export default withNextIntl(configWithSentry);
