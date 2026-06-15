import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/navigation";
import { GoogleAnalytics } from "@next/third-parties/google";
import Navigation from "@/components/Navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ErrorBoundary from "@/components/ErrorBoundary";
import ClientCookieConsent from "@/components/ClientCookieConsent";
import AuthProvider from "@/components/AuthProvider";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com";

// Locale mapping for OG / hreflang
const LOCALE_MAP: Record<string, string> = {
  en: "en_US",
  zh: "zh_CN",
  ja: "ja_JP",
  ko: "ko_KR",
  es: "es_ES",
  fr: "fr_FR",
  de: "de_DE",
};
const HREFLANG_MAP: Record<string, string> = {
  en: "en",
  zh: "zh",
  ja: "ja",
  ko: "ko",
  es: "es",
  fr: "fr",
  de: "de",
};

// Localized descriptions
const DESCRIPTIONS: Record<string, string> = {
  en: "Upload any PDF and get AI-powered summaries instantly.",
  zh: "上传任意 PDF，即刻获得 AI 智能摘要。",
  ja: "PDFをアップロードするだけで、AIが瞬時に要約を生成します。",
  ko: "PDF를 업로드하면 AI가 즉시 요약을 생성합니다.",
  es: "Sube cualquier PDF y obtén resúmenes instantáneos con IA.",
  fr: "Téléchargez n'importe quel PDF et obtenez des résumés instantanés par IA.",
  de: "Laden Sie ein PDF hoch und erhalten Sie sofort KI-gestützte Zusammenfassungen.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const ogLocale = LOCALE_MAP[locale] || "en_US";
  const description = DESCRIPTIONS[locale] || DESCRIPTIONS.en;

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      template: "%s | PDF Summary AI",
      default: "PDF Summary AI - Get Insights in Seconds",
    },
    description,
    keywords: [
      "PDF", "summarize", "AI", "document", "summary",
      "PDF summarizer", "AI summary", "document summarizer",
      "free PDF summarizer", "AI document summary",
    ],
    authors: [{ name: "PDF Summary AI" }],
    openGraph: {
      type: "website",
      locale: ogLocale,
      url: `/${locale}`,
      siteName: "PDF Summary AI",
      title: "PDF Summary AI - Get Insights in Seconds",
      description,
      images: [
        {
          url: `/og?title=${encodeURIComponent("PDF Summary AI - Get Insights in Seconds")}&description=${encodeURIComponent(description)}&locale=${locale}`,
          width: 1200,
          height: 630,
          alt: "PDF Summary AI",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "PDF Summary AI",
      description,
      images: [`/og?title=${encodeURIComponent("PDF Summary AI")}&description=${encodeURIComponent(description)}&locale=${locale}`],
    },
    robots: { index: true, follow: true },
    alternates: {
      canonical: `${BASE_URL}/${locale}`,
      languages: Object.fromEntries(
        Object.entries(HREFLANG_MAP).map(([key, lang]) => [
          key,
          `${BASE_URL}/${key}`,
        ])
      ),
    },
    manifest: "/manifest.json",
  };
}

export default async function LocaleLayout({
  children,
  params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "PDF Summary AI",
    url: BASE_URL,
    description: "Upload any PDF and get AI-powered summaries instantly.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "All",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ErrorBoundary messages={em}>
            <AuthProvider>
              <div className="min-h-screen bg-white">
                <div className="bg-gray-50 border-b">
                  <div className="max-w-6xl mx-auto px-4 py-2 flex justify-end">
                    <LanguageSwitcher />
                  </div>
                </div>
                <Navigation />
                {children}
              </div>
            </AuthProvider>
          </ErrorBoundary>
          <ClientCookieConsent />
          {process.env.NEXT_PUBLIC_GA_ID && (
            <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
          )}
          <Script
            id="clarity-analytics"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","x5r3pirm6e");`,
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
