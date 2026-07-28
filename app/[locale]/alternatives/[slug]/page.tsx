import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import { alternatives, type Alternative } from "@/lib/alternatives";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com";

export function generateStaticParams() {
  return Object.keys(alternatives).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const alt = alternatives[slug];
  if (!alt) return {};

  return {
    title: alt.metaTitle,
    description: alt.metaDescription,
    keywords: [`${alt.competitorName} alternative`, `alternative to ${alt.competitorName}`, `better than ${alt.competitorName}`, "PDF summarizer", "free PDF summary"],
    openGraph: {
      title: alt.metaTitle,
      description: alt.metaDescription,
      type: "article",
      url: `${BASE_URL}/alternatives/${slug}`,
    },
    alternates: {
      canonical: `${BASE_URL}/alternatives/${slug}`,
    },
  };
}

export default async function AlternativePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations();
  const alt: Alternative | undefined = alternatives[slug];

  if (!alt) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-gray-600 mb-6">Comparison not found.</p>
          <Link href="/alternatives" className="text-blue-600 hover:underline">View all comparisons</Link>
        </div>
      </main>
    );
  }

  // FAQPage + BreadcrumbList JSON-LD
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: alt.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Alternatives", item: `${BASE_URL}/alternatives` },
      { "@type": "ListItem", position: 3, name: alt.competitorName, item: `${BASE_URL}/alternatives/${slug}` },
    ],
  };

  return (
    <main className="min-h-screen bg-white" id="main-content">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <Link href="/alternatives" className="hover:text-blue-600">Alternatives</Link>
          <span>/</span>
          <span className="text-gray-900">{alt.competitorName}</span>
        </nav>
      </div>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{alt.h1}</h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-8">{alt.intro}</p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition"
          >
            {t("cta.button")}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
          >
            View Pricing
          </Link>
        </div>
      </div>

      {/* Why Switch */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Why switch from {alt.competitorName}?</h2>
          <ul className="space-y-3">
            {alt.whySwitch.map((reason, i) => (
              <li key={i} className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Feature comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-4 font-semibold text-gray-900 border-b border-gray-200">Feature</th>
                  <th className="text-left p-4 font-semibold text-blue-600 border-b border-gray-200">PDFSum</th>
                  <th className="text-left p-4 font-semibold text-gray-500 border-b border-gray-200">{alt.competitorName}</th>
                </tr>
              </thead>
              <tbody>
                {alt.comparison.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="p-4 text-sm text-gray-700 border-b border-gray-100">{row.feature}</td>
                    <td className="p-4 text-sm border-b border-gray-100">
                      <span className={row.pdfsumWins ? "text-green-600 font-semibold" : "text-gray-700"}>
                        {row.pdfsum}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500 border-b border-gray-100">{row.competitor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Verdict */}
      <section className="bg-blue-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Our verdict</h2>
          <p className="text-gray-700 leading-relaxed text-lg">{alt.verdict}</p>
        </div>
      </section>

      {/* FAQs */}
      {alt.faqs.length > 0 && (
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-4">
              {alt.faqs.map((faq, i) => (
                <details key={i} className="bg-white border border-gray-200 rounded-xl p-5 group">
                  <summary className="font-semibold text-gray-900 cursor-pointer flex items-center justify-between">
                    {faq.question}
                    <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="mt-3 text-gray-600 leading-relaxed">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-12 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
          <p className="text-xl text-blue-100 mb-8">{t("cta.subtitle")}</p>
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
      </section>
    </main>
  );
}
