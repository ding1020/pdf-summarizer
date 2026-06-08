import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com"),
  title: { template: "%s | PDF Summary AI", default: "PDF Summary AI - Get Insights in Seconds" },
  description: "Upload any PDF and get AI-powered summaries instantly.",
};

export default async function LocaleLayout({
  children,
  params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          <div style={{ padding: 50, fontFamily: "sans-serif" }}>
            <p style={{ color: "green" }}>✅ Step 2: i18n + font + metadata works</p>
            {children}
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
