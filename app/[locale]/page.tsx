import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import { PLAN_AMOUNTS } from "@/lib/constants";
import HomeUploadWrapper from "@/components/HomeUploadWrapper";
import NewsletterSignup from "@/components/NewsletterSignup";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com";

const DESCRIPTIONS: Record<string, string> = {
  en: "Upload any PDF and get AI-powered summaries instantly. Extract key insights in seconds, not hours. Free plan available — no credit card required.",
  zh: "上传任意 PDF，即刻获得 AI 智能摘要。数秒内提取关键洞察，无需信用卡，免费开始使用。",
  ja: "PDFをアップロードするだけで、AIが瞬時に要約を生成。数秒で重要ポイントを抽出。クレジットカード不要の無料プランあり。",
  ko: "PDF를 업로드하면 AI가 즉시 요약을 생성합니다. 몇 초 만에 핵심 인사이트를 추출하세요. 신용카드 불필요, 무료 플랜 제공.",
  es: "Sube cualquier PDF y obtén resúmenes instantáneos con IA. Extrae ideas clave en segundos. Plan gratuito disponible, sin tarjeta de crédito.",
  fr: "Téléchargez n'importe quel PDF et obtenez des résumés instantanés par IA. Extrayez les points clés en quelques secondes. Plan gratuit, sans carte.",
  de: "Laden Sie ein PDF hoch und erhalten Sie sofort KI-Zusammenfassungen. Extrahieren Sie Kernaussagen in Sekunden. Kostenloser Plan — keine Karte nötig.",
};

const LOCALE_MAP: Record<string, string> = {
  en: "en_US", zh: "zh_CN", ja: "ja_JP", ko: "ko_KR", es: "es_ES", fr: "fr_FR", de: "de_DE",
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
    title: "PDF Summary AI — AI-Powered Document Summaries in Seconds",
    description,
    keywords: [
      "PDF summarizer", "AI summary", "document summarizer", "PDF AI",
      "summarize PDF", "free PDF summarizer", "AI document analysis",
      "PDF insights", "document intelligence",
    ],
    openGraph: {
      type: "website",
      locale: ogLocale,
      url: `${BASE_URL}/${locale}`,
      siteName: "PDF Summary AI",
      title: "PDF Summary AI — AI-Powered Document Summaries",
      description,
      images: [
        {
          url: `/og?title=${encodeURIComponent("AI-Powered PDF Summaries")}&description=${encodeURIComponent(description)}&locale=${locale}`,
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
      images: [`/og?title=${encodeURIComponent("AI-Powered PDF Summaries")}&description=${encodeURIComponent(description)}&locale=${locale}`],
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}`,
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const heroSubtitle = t("hero.subtitle");
  const siteName = "PDF Summary AI";

  // ── Homepage-specific JSON-LD ──
  // Note: aggregateRating removed — will be re-added once we collect real user reviews
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteName,
    url: BASE_URL,
    description: heroSubtitle,
    applicationCategory: "BusinessApplication",
    operatingSystem: "All",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "0",
      highPrice: ((PLAN_AMOUNTS.pro_yearly || 5900) / 100).toFixed(2),
      offerCount: "2",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen bg-white" id="main-content">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-300 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-32">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                {t("hero.badge")}
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                {t("hero.title1")}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-cyan-200">
                  {t("hero.title2")}
                </span>
              </h1>

              <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
                {heroSubtitle}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-700 text-lg font-semibold rounded-xl hover:bg-blue-50 transition shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {t("hero.cta1")}
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white/30 text-white text-lg font-medium rounded-xl hover:bg-white/10 transition"
                >
                  {t("hero.cta2")}
                </Link>
              </div>

              {/* Demo Preview */}
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center">
                        <svg className="w-12 h-12 md:w-16 md:h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center">
                        <svg className="w-12 h-12 md:w-16 md:h-16 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center">
                        <svg className="w-12 h-12 md:w-16 md:h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-gray-600">
                    {[t("hero.uploadPdf"), t("hero.aiAnalysis"), t("hero.getSummary")].map((label) => (
                      <div key={label} className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Upload — Immediate trial on landing page */}
        <HomeUploadWrapper />

        {/* Trust Indicators */}
        <section className="py-8 bg-gray-50 border-b">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 text-gray-500 text-sm">
              {[
                { label: t("trust.secure"), icon: "shield" },
                { label: t("trust.noCreditCard"), icon: "check" },
                { label: t("trust.fast"), icon: "clock" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    {item.icon === "shield" && (
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    )}
                    {item.icon === "check" && (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    )}
                    {item.icon === "clock" && (
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    )}
                  </svg>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t("features.title")}</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t("features.subtitle")}</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { key: "fast", color: "blue" },
                { key: "secure", color: "green" },
                { key: "free", color: "purple" },
              ].map(({ key, color }) => {
                const colorMap: Record<string, { bg: string; text: string }> = {
                  blue: { bg: "bg-blue-100", text: "text-blue-600" },
                  green: { bg: "bg-green-100", text: "text-green-600" },
                  purple: { bg: "bg-purple-100", text: "text-purple-600" },
                };
                const classes = colorMap[color] || colorMap.blue;
                return (
                <div key={key} className="bg-white border border-gray-200 p-8 rounded-2xl hover:shadow-lg transition-shadow">
                  <div className={`w-14 h-14 ${classes.bg} rounded-xl flex items-center justify-center mb-6`}>
                    <svg className={`w-7 h-7 ${classes.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {key === "fast" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />}
                      {key === "secure" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />}
                      {key === "free" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{t(`features.${key}.title` as any)}</h3>
                  <p className="text-gray-600 leading-relaxed">{t(`features.${key}.desc` as any)}</p>
                </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t("howItWorks.title")}</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t("howItWorks.subtitle")}</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">{i}</div>
                  <h3 className="text-xl font-bold mb-3">{t(`howItWorks.step${i}Title`)}</h3>
                  <p className="text-gray-600">{t(`howItWorks.step${i}Desc`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases — honest section, no fake stats */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t("features.title")}</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Trusted by students, researchers, and professionals worldwide for fast, accurate document summaries.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {[
                { icon: "academic", title: "Students", desc: "Summarize lecture notes, textbooks, and research papers in seconds." },
                { icon: "research", title: "Researchers", desc: "Process literature reviews faster — scan 20+ papers in an afternoon." },
                { icon: "business", title: "Professionals", desc: "Extract key points from reports, contracts, and proposals instantly." },
                { icon: "legal", title: "Legal Teams", desc: "Get concise summaries of lengthy legal documents and case files." },
              ].map((item) => (
                <div key={item.title} className="bg-white border border-gray-200 p-6 rounded-2xl hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {item.icon === "academic" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />}
                      {item.icon === "research" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />}
                      {item.icon === "business" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />}
                      {item.icon === "legal" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />}
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Key highlights — factual, no fake numbers */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
              {[
                { num: "7", label: "Languages" },
                { num: "30s", label: "Avg Speed" },
                { num: "$0", label: "Free Plan" },
                { num: "GDPR", label: "Compliant" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-1">{stat.num}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* CTA Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-10 md:p-16 text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("cta.title")}</h2>
              <p className="text-xl text-blue-100 mb-8 max-w-xl mx-auto">{t("cta.subtitle")}</p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-10 py-4 bg-white text-blue-700 text-lg font-semibold rounded-xl hover:bg-blue-50 transition shadow-xl"
              >
                {t("cta.button")}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* Newsletter Signup */}
        <NewsletterSignup locale={locale} />

        {/* Footer */}
        <footer className="bg-gray-900 py-12">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="font-bold text-lg text-white">{t("footer.brand")}</span>
              </div>
              <div className="flex items-center gap-6 text-gray-400 text-sm">
                <Link href="/pricing" className="hover:text-white transition">{t("footer.pricing")}</Link>
                <Link href="/blog" className="hover:text-white transition">Blog</Link>
                <Link href="/changelog" className="hover:text-white transition">Changelog</Link>
                <Link href="/privacy" className="hover:text-white transition">{t("footer.privacy")}</Link>
                <Link href="/terms" className="hover:text-white transition">{t("footer.terms")}</Link>
                <Link href="/refund" className="hover:text-white transition">{t("footer.refund")}</Link>
              </div>
              <div className="text-gray-500 text-sm">
                &copy; {new Date().getFullYear()} {t("footer.copyright")}
              </div>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
