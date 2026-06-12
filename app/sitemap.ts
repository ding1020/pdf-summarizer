import { MetadataRoute } from "next/types";

const locales = ["en", "zh", "ja", "ko", "es", "fr", "de"];

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com";

// Routes without locale prefix (handled by next-intl middleware)
const routesWithoutLocale = ["/sign-in", "/sign-up"];

// Routes with locale prefix
const localizedRoutes = ["", "/pricing", "/terms", "/privacy", "/refund", "/help", "/cookies"];

// Stable build date — prevents unnecessary sitemap churn on every deploy
const BUILD_DATE = "2026-06-11";

export default function sitemap(): MetadataRoute.Sitemap {
  const sitemapRoutes: MetadataRoute.Sitemap = [];

  // Add routes without locale prefix
  routesWithoutLocale.forEach((route) => {
    sitemapRoutes.push({
      url: `${baseUrl}${route}`,
      lastModified: new Date(BUILD_DATE),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    });
  });

  // Add localized routes
  localizedRoutes.forEach((route) => {
    locales.forEach((locale) => {
      sitemapRoutes.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(BUILD_DATE),
        changeFrequency: "weekly" as const,
        priority: route === "" ? 1 : 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${baseUrl}/${l}${route}`])
          ),
        },
      });
    });
  });

  return sitemapRoutes;
}
