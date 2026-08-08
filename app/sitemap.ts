import { MetadataRoute } from "next/types";
import { blogSlugs } from "@/lib/blog-posts";
import { alternatives } from "@/lib/alternatives";

const locales = ["en", "zh", "ja", "ko", "es", "fr", "de"];

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com";

// Routes without locale prefix (handled by next-intl middleware)
const routesWithoutLocale: string[] = [];

// Routes with locale prefix
const localizedRoutes = ["", "/pricing",
    "/reviews",
    "/dmca",
    "/cookies", "/terms", "/privacy", "/refund", "/help", "/blog", "/changelog", "/alternatives"];

// Use current date for lastModified — reflects latest deployment
const NOW = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const sitemapRoutes: MetadataRoute.Sitemap = [];

  // Add routes without locale prefix
  routesWithoutLocale.forEach((route) => {
    sitemapRoutes.push({
      url: `${baseUrl}${route}`,
      lastModified: NOW,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    });
  });

  // Add localized routes (static pages)
  localizedRoutes.forEach((route) => {
    locales.forEach((locale) => {
      sitemapRoutes.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: NOW,
        changeFrequency: "weekly" as const,
        priority: route === "" ? 1 : route === "/blog" ? 0.9 : 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${baseUrl}/${l}${route}`])
          ),
        },
      });
    });
  });

  // Add blog post URLs for each locale
  blogSlugs.forEach((slug) => {
    locales.forEach((locale) => {
      sitemapRoutes.push({
        url: `${baseUrl}/${locale}/blog/${slug}`,
        lastModified: NOW,
        changeFrequency: "monthly" as const,
        priority: 0.7,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${baseUrl}/${l}/blog/${slug}`])
          ),
        },
      });
    });
  });

  // Add alternative comparison pages for each locale
  const altSlugs = Object.keys(alternatives);
  altSlugs.forEach((slug) => {
    locales.forEach((locale) => {
      sitemapRoutes.push({
        url: `${baseUrl}/${locale}/alternatives/${slug}`,
        lastModified: NOW,
        changeFrequency: "monthly" as const,
        priority: 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${baseUrl}/${l}/alternatives/${slug}`])
          ),
        },
      });
    });
  });

  return sitemapRoutes;
}
