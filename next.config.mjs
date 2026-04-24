import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pdf-parse"],
  // Use webpack instead of Turbopack for build
  experimental: {
    turbo: undefined,
  },
};

export default withNextIntl(nextConfig);
