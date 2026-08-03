import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import { alternatives } from "@/lib/alternatives";

// ISR — comparison data is semi-static, revalidate every 6 hours
export const revalidate = 21600;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "PDF Summarizer Alternatives | PDFSum — Free, 7 Languages, No Credit Card",
    description: "Comparing PDFSum with ChatPDF, Notion AI, PDF.ai, UPDF, and Smallpdf. See why PDFSum is the best alternative — more free summaries, 7 languages, Chat with PDF, and a developer API.",
    keywords: ["ChatPDF alternative", "PDF summarizer alternative", "best PDF AI tool", "compare PDF summarizers", "free PDF summarizer"],
  };
}

export default async function AlternativesPage() {
  const t = await getTranslations();

  return (
    <main className="min-h-screen bg-gray-50" id="main-content">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Why choose PDFSum over other tools?
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            See how PDFSum compares to the most popular PDF summarizer and AI document tools.
            More free summaries, 7-language support, Chat with PDF, and a developer API — all in one place.
          </p>
        </div>

        <div className="space-y-4">
          {Object.values(alternatives).map((alt) => (
            <Link
              key={alt.slug}
              href={`/alternatives/${alt.slug}`}
              className="block bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                    {alt.h1}
                  </h2>
                  <p className="text-sm text-gray-600 line-clamp-2">{alt.metaDescription}</p>
                </div>
                <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition shadow-lg"
          >
            {t("cta.button")}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </main>
  );
}
