import { Metadata } from "next";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ReactMarkdown from "react-markdown";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.pdfsum.com";

interface Props {
  params: Promise<{ locale: string; shareId: string }>;
}

async function getSharedDocument(shareId: string) {
  const doc = await prisma.document.findUnique({
    where: { shareId, isPublic: true },
    select: {
      filename: true,
      summary: true,
      pageCount: true,
      createdAt: true,
    },
  });
  return doc;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareId } = await params;
  const doc = await getSharedDocument(shareId);

  if (!doc?.summary) {
    return { title: "Shared Summary Not Found | PDF Summary AI" };
  }

  const preview = doc.summary.slice(0, 160).replace(/[#*_`~>\[\]()]/g, "");

  return {
    title: `${doc.filename} — AI Summary | PDF Summary AI`,
    description: preview,
    openGraph: {
      type: "article",
      title: `${doc.filename} — AI Summary`,
      description: preview,
      images: [
        {
          url: `/og?title=${encodeURIComponent(doc.filename)}&description=${encodeURIComponent(`AI-generated summary • ${doc.pageCount} pages`)}&locale=en`,
          width: 1200,
          height: 630,
          alt: doc.filename,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${doc.filename} — AI Summary`,
      description: preview,
    },
    robots: { index: false, follow: false },
  };
}

export default async function SharePage({ params }: Props) {
  const { locale, shareId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const doc = await getSharedDocument(shareId);

  if (!doc?.summary) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50" id="main-content">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{doc.filename}</h1>
              <p className="text-blue-100 text-sm">
                {doc.pageCount} pages • Shared via PDF Summary AI
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="font-semibold text-gray-900">AI Summary</h2>
          </div>
          <div className="prose prose-blue max-w-none">
            <ReactMarkdown>{doc.summary}</ReactMarkdown>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 mb-4">
            Summaries powered by PDF Summary AI. Upload your own PDFs and get instant summaries.
          </p>
          <a
            href={`/${locale}/dashboard`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Try It Free
          </a>
        </div>
      </div>
    </main>
  );
}
