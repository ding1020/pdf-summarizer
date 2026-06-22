import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // TypeScript & ESLint: use strict mode for production safety
  // If build fails due to type errors, fix them rather than ignoring
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  // pdf-parse must be bundled as server external
  serverExternalPackages: ["pdf-parse"],

  // ⚡ Performance
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // 🔒 Security headers (CSP is set dynamically in middleware with per-request nonce)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
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
