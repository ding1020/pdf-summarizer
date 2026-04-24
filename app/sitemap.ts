import { MetadataRoute } from "next/types";

const locales = ["en", "zh", "ja", "ko", "es", "fr", "de"];

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/pricing", "/sign-in", "/sign-up"].flatMap((route) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${baseUrl}/${l}${route}`])
        ),
      },
    }))
  );

  return routes;
}
