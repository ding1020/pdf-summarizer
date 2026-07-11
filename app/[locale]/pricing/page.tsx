import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PricingClient from "./PricingClient";
import { PLAN_AMOUNTS } from "@/lib/constants";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com";

const DESCRIPTIONS: Record<string, string> = {
  en: "Simple, transparent pricing for AI-powered PDF summaries. Start free with 5 summaries/day. Upgrade to Pro for unlimited access — only $9/month.",
  zh: "简单透明的 AI PDF 摘要定价。每天 5 次免费摘要，升级 Pro 无限使用 — 仅 ¥59/月。",
  ja: "シンプルで透明なAI PDF要約の料金プラン。1日5回の無料要約。プロ版は月額わずか$9で無制限。",
  ko: "간단하고 투명한 AI PDF 요약 가격. 하루 5회 무료 요약. 프로 플랜은 월 $9에 무제한 이용.",
  es: "Precios simples y transparentes para resúmenes PDF con IA. Comienza gratis con 5 resúmenes/día. Pro ilimitado — solo $9/mes.",
  fr: "Tarification simple et transparente pour les résumés PDF par IA. Gratuit avec 5 résumés/jour. Pro illimité — seulement 9$/mois.",
  de: "Einfache, transparente Preise für KI-PDF-Zusammenfassungen. Kostenlos mit 5/Tag starten. Pro unbegrenzt — nur 9$/Monat.",
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
    title: "Pricing — PDF Summary AI",
    description,
    keywords: [
      "PDF summarizer pricing", "AI summary plans", "document summarizer cost",
      "PDF AI free trial", "Pro PDF summarizer",
    ],
    openGraph: {
      type: "website",
      locale: ogLocale,
      url: `${BASE_URL}/${locale}/pricing`,
      siteName: "PDF Summary AI",
      title: "Pricing — PDF Summary AI",
      description,
      images: [
        {
          url: `/og?title=${encodeURIComponent("Simple Pricing")}&description=${encodeURIComponent(description)}&locale=${locale}`,
          width: 1200,
          height: 630,
          alt: "PDF Summary AI Pricing",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Pricing — PDF Summary AI",
      description,
      images: [`/og?title=${encodeURIComponent("Simple Pricing")}&description=${encodeURIComponent(description)}&locale=${locale}`],
    },
    robots: { index: true, follow: true },
    alternates: {
      canonical: `${BASE_URL}/${locale}/pricing`,
    },
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Pricing — PDF Summary AI",
    description: t("subtitle"),
    url: `${BASE_URL}/${locale}/pricing`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          item: {
            "@type": "Product",
            name: "PDF Summary AI Free",
            description: t("free.description"),
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
          },
        },
        {
          "@type": "ListItem",
          position: 2,
          item: {
            "@type": "Product",
            name: "PDF Summary AI Pro",
            description: t("pro.description"),
            offers: [
              {
                "@type": "Offer",
                name: "Pro Monthly",
                price: ((PLAN_AMOUNTS.pro_monthly || 799) / 100).toFixed(2),
                priceCurrency: "USD",
              },
              {
                "@type": "Offer",
                name: "Pro Yearly",
                price: ((PLAN_AMOUNTS.pro_yearly || 6900) / 100).toFixed(2),
                priceCurrency: "USD",
              },
            ],
          },
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PricingClient />
    </>
  );
}
