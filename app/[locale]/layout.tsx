import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import ClientClerkProvider from "@/components/ClientClerkProvider";
import ErrorBoundary from "@/components/ErrorBoundary";

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
  const errorMessages = {
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
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          <ClientClerkProvider>
            <ErrorBoundary messages={errorMessages}>
              <div style={{ padding: 50, fontFamily: "sans-serif" }}>
                <p style={{ color: "green" }}>✅ Step 3: + ClientClerkProvider + ErrorBoundary works</p>
                {children}
              </div>
            </ErrorBoundary>
          </ClientClerkProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
