import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/navigation";
import { Analytics } from "@vercel/analytics/react";
import Navigation from "@/components/Navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ErrorBoundary from "@/components/ErrorBoundary";
import ClientCookieConsent from "@/components/ClientCookieConsent";
import AuthProvider from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PwaRegister } from "@/components/PwaRegister";
import { ToastProvider } from "@/hooks/useToast";
import { ConfirmProvider } from "@/hooks/useConfirm";
import { ToastContainer } from "@/components/Toast";
import { PLAN_AMOUNTS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import "@/app/globals.css";

// ── Startup diagnostics for production analytics ──
if (process.env.NODE_ENV === "production") {
  if (!process.env.NEXT_PUBLIC_CLARITY_ID) {
    logger.info("[analytics] NEXT_PUBLIC_CLARITY_ID is not set — Microsoft Clarity session recording disabled.");
  }
}

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

  // Read CSP nonce from middleware (via short-lived cookie)
  const cookieStore = await cookies();
  const nonce = cookieStore.get("__csp_nonce")?.value;
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
    "@type": "SoftwareApplication",
    name: "PDF Summary AI",
    url: BASE_URL,
    description: "Upload any PDF and get AI-powered summaries instantly. Extract key insights in seconds, not hours.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "All",
    offers: [
      {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: "CNY",
      },
      {
        "@type": "Offer",
        name: "Pro Monthly",
        price: ((PLAN_AMOUNTS.pro_monthly || 5900) / 100).toFixed(2),
        priceCurrency: "CNY",
      },
      {
        "@type": "Offer",
        name: "Pro Yearly",
        price: ((PLAN_AMOUNTS.pro_yearly || 57900) / 100).toFixed(2),
        priceCurrency: "CNY",
      },
    ],
    featureList: [
      "AI-powered PDF summarization",
      "Multi-language support (7 languages)",
      "Streaming real-time summaries",
      "Secure encrypted processing",
    ],
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
        <meta name="baidu-site-verification" content="codeva-xIqxE0gVLC" />
        {process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION && (
          <meta name="msvalidate.01" content={process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION} />
        )}
        {process.env.NEXT_PUBLIC_YANDEX_SITE_VERIFICATION && (
          <meta name="yandex-verification" content={process.env.NEXT_PUBLIC_YANDEX_SITE_VERIFICATION} />
        )}
        {process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && (
          <meta name="google-site-verification" content={process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION} />
        )}
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

      </head>
      <body className={inter.className}>

        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
          <ToastProvider>
          <ConfirmProvider>
          <ErrorBoundary messages={em}>
            <AuthProvider>
              <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors">
                <div className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-800 transition-colors">
                  <div className="max-w-6xl mx-auto px-4 py-2 flex justify-end items-center gap-1">
                    <a
                      href="#main-content"
                      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg"
                    >
                      Skip to content
                    </a>
                    <ThemeToggle />
                    <LanguageSwitcher />
                  </div>
                </div>
                <Navigation />
                <main id="main-content">{children}</main>
              </div>
              <ToastContainer />
            </AuthProvider>
          </ErrorBoundary>
          </ConfirmProvider>
          </ToastProvider>
          <ClientCookieConsent />
          <Analytics />
          {process.env.NEXT_PUBLIC_CLARITY_ID && (
            <Script
              id="clarity-analytics"
              strategy="afterInteractive"
              nonce={nonce}
              dangerouslySetInnerHTML={{
                __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${process.env.NEXT_PUBLIC_CLARITY_ID}");`,
              }}
            />
          )}
          {/* Google Analytics (GA4) — loaded only in production when ID is set */}
          {process.env.NEXT_PUBLIC_GA_ID && (
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              nonce={nonce}
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            />
          )}
          {process.env.NEXT_PUBLIC_GA_ID && (
            <Script
              id="google-analytics-init"
              strategy="afterInteractive"
              nonce={nonce}
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}',{send_page_view:true});`,
              }}
            />
          )}
          {/* Google Tag Manager — loaded only in production when ID is set */}
          {process.env.NEXT_PUBLIC_GTM_ID && (
            <Script
              id="gtm-script"
              strategy="afterInteractive"
              nonce={nonce}
              dangerouslySetInnerHTML={{
                __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;var n=d.querySelector('[nonce]');n&&j.setAttribute('nonce',n.nonce||'');f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${process.env.NEXT_PUBLIC_GTM_ID}');`,
              }}
            />
          )}
          <PwaRegister />
          <Script
            id="baidu-push"
            strategy="afterInteractive"
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `(function(){var bp=document.createElement('script');var curProtocol=window.location.protocol.split(':')[0];if(curProtocol==='https'){bp.src='https://zz.bdstatic.com/linksubmit/push.js';}else{bp.src='http://push.zhanzhang.baidu.com/push.js';}var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(bp,s);})();`,
            }}
          />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
