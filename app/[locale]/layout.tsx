import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ClerkProvider } from "@clerk/nextjs";
import Navigation from "@/components/Navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ErrorBoundary from "@/components/ErrorBoundary";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com"),
  title: {
    template: "%s | PDF Summary AI",
    default: "PDF Summary AI - Get Insights in Seconds",
  },
  description: "Upload any PDF and get AI-powered summaries instantly. Save time and extract key insights from any document.",
  keywords: ["PDF", "summarize", "AI", "document", "summary", "text extraction"],
  authors: [{ name: "PDF Summary AI" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "PDF Summary AI",
    title: "PDF Summary AI - Get Insights in Seconds",
    description: "Upload any PDF and get AI-powered summaries instantly.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDF Summary AI - Get Insights in Seconds",
    description: "Upload any PDF and get AI-powered summaries instantly.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={inter.className}>
        <ClerkProvider>
          <ErrorBoundary>
            <NextIntlClientProvider messages={messages}>
              <div className="min-h-screen bg-white">
                {/* Top Bar with Language Switcher */}
                <div className="bg-gray-50 border-b">
                  <div className="max-w-6xl mx-auto px-4 py-2 flex justify-end">
                    <LanguageSwitcher />
                  </div>
                </div>
                <Navigation />
                {children}
              </div>
            </NextIntlClientProvider>
          </ErrorBoundary>
        </ClerkProvider>
      </body>
    </html>
  );
}
