import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Changelog | PDF Summary AI",
    description: "Latest updates and improvements to PDF Summary AI.",
  };
}

const changelog = [
  {
    date: "2026-07-17",
    version: "v2.1",
    title: "Performance & Conversion Optimization",
    changes: [
      "In-session upload on landing page — try without signing up",
      "Enhanced yearly pricing display with savings highlight",
      "Google Analytics & Tag Manager integration ready",
      "NPS feedback modal after 7 summaries",
      "Quick thumbs-up/down feedback on summaries",
      "Activation reminder email for new users",
      "Trial expiring email with 20% discount offer",
      "UTM tracking for marketing attribution",
      "AI max_tokens increased to 4096 for better summaries",
    ],
  },
  {
    date: "2026-07-12",
    version: "v2.0",
    title: "Security & Infrastructure Overhaul",
    changes: [
      "Upstash Redis token rotated and secured",
      "Cleaned up all exposed credentials",
      "Removed unused analytics dependencies",
      "Content Security Policy tightened",
      "Cron-based subscription management improved",
    ],
  },
  {
    date: "2026-07-06",
    version: "v1.9",
    title: "Multi-Language & Payments",
    changes: [
      "8-language support (EN, ZH, JA, KO, ES, FR, DE, RU)",
      "Creem payment integration for international users",
      "Alipay & WeChat Pay manual verification for Chinese users",
      "3-day Pro trial with automatic downgrade",
      "Win-back email sequence for churned users",
    ],
  },
  {
    date: "2026-06-15",
    version: "v1.5",
    title: "API & Developer Platform",
    changes: [
      "Public API v1 with Bearer token authentication",
      "API key management dashboard (5 keys per user)",
      "Usage tracking and logging for API calls",
      "Streaming SSE summarization endpoint",
      "Developer documentation at /api-docs",
    ],
  },
  {
    date: "2026-06-01",
    version: "v1.0",
    title: "Public Launch",
    changes: [
      "PDF upload and AI summarization with DeepSeek",
      "Multi-provider fallback (DeepSeek → Groq → SiliconFlow)",
      "Summary caching to reduce costs",
      "Content Security Policy and CSRF protection",
      "Rate limiting for all API endpoints",
    ],
  },
];

export default async function ChangelogPage() {
  const t = await getTranslations();

  return (
    <main className="min-h-screen bg-gray-50" id="main-content">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Changelog</h1>
          <p className="text-lg text-gray-600">
            Every update and improvement we ship to PDF Summary AI.
          </p>
        </div>

        <div className="space-y-8">
          {changelog.map((entry) => (
            <div key={entry.version} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                  {entry.version}
                </span>
                <time className="text-sm text-gray-400">{entry.date}</time>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">{entry.title}</h2>
              <ul className="space-y-2">
                {entry.changes.map((change) => (
                  <li key={change} className="flex items-start gap-2 text-gray-600">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
