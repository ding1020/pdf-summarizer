import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

export const locales = ["en", "zh", "ja", "ko", "es", "fr", "de"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export default getRequestConfig(async ({ locale }) => {
  const safeLocale = locale && locales.includes(locale as Locale) ? locale : defaultLocale;

  return {
    locale: safeLocale,
    messages: (await import(`./messages/${safeLocale}.json`)).default,
  };
});
