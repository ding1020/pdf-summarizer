import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

// TEMPORARY: Ultra-minimal layout to isolate 500 root cause.
// If this works, the issue is in one of: Navigation, LanguageSwitcher,
// ErrorBoundary, ClientClerkProvider, CookieConsent, or metadata.
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  let messages: Record<string, unknown> = {};
  try {
    messages = await getMessages({ locale });
  } catch {
    // If getMessages fails, use empty — we'll know it's the culprit
    messages = { error: { title: "i18n FAILED" } };
  }

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <div style={{ padding: 50, fontFamily: "sans-serif" }}>
            <p style={{ color: "green" }}>
              ✅ Minimal layout works (locale: {locale})
            </p>
            {children}
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
