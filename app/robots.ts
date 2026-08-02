import { MetadataRoute } from "next/types";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/admin",
          "/share/",
          "/sign-in",
          "/sign-up",
          "/forgot-password",
          "/reset-password",
          "/dashboard/subscription",
        ],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com"}/sitemap.xml`,
  };
}
