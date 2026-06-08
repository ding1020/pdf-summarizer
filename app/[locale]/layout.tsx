import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import Navigation from "@/components/Navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ErrorBoundary from "@/components/ErrorBoundary";
import CookieConsent from "@/components/CookieConsent";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com"),
  title: { template: "%s | PDF Summary AI", default: "PDF Summary AI - Get Insights in Seconds" },
  description: "Upload any PDF and get AI-powered summaries instantly.",
  keywords: ["PDF", "summarize", "AI", "document", "summary"],
  authors: [{ name: "PDF Summary AI" }],
  openGraph: {
    type: "website", locale: "en_US", url: "/",
    siteName: "PDF Summary AI",
    title: "PDF Summary AI - Get Insights in Seconds",
    description: "Upload any PDF and get AI-powered summaries instantly.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "PDF Summary AI" }],
  },
  twitter: { card: "summary_large_image", title: "PDF Summary AI", description: "Upload any PDF and get AI-powered summaries instantly.", images: ["/og-image.png"] },
  robots: { index: true, follow: true },
};

export default async function LocaleLayout({
  children,
  params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const messages = await getMessages({ locale });
  const em = {
    title: messages.error?.title || "Error",
    description: "Something went wrong",
    tryAgain: "Try Again",
    goHome: "Go Home",
    errorDetails: "Details",
    contactSupport: "contact",
    ifKeepsHappening: "If this keeps happening,",
  };

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://api.deepseek.com" />
        <link rel="dns-prefetch" href="https://api.groq.com" />
        <link rel="dns-prefetch" href="https://api.siliconflow.cn" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          <ErrorBoundary messages={em}>
            <div className="min-h-screen bg-white">
              <div className="bg-gray-50 border-b">
                <div className="max-w-6xl mx-auto px-4 py-2 flex justify-end">
                  <LanguageSwitcher />
                </div>
              </div>
              <Navigation />
              <div style={{ padding: "20px 50px", fontFamily: "sans-serif" }}>
                <p style={{ color: "green" }}>✅ FULL layout working (no Clerk)</p>
              </div>
              {children}
            </div>
          </ErrorBoundary>
        </NextIntlClientProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
