"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";

interface SummaryDisplayProps {
  summary: string;
  isSummarizing: boolean;
  copied: boolean;
  filename: string;
  pageCount: number;
  documentId: string;
  sharingDocumentId: string | null;
  onCopy: () => void;
  onDownload: () => void;
  onShare: () => void;
  onCancel: () => void;
}

const SummaryDisplay = memo(function SummaryDisplay({
  summary,
  isSummarizing,
  copied,
  documentId,
  sharingDocumentId,
  onCopy,
  onDownload,
  onShare,
  onCancel,
}: SummaryDisplayProps) {
  const t = useTranslations("upload");

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl border border-blue-100 dark:border-blue-900">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="font-semibold text-blue-900 dark:text-blue-200">{t("aiSummary")}</h3>
        </div>
        <div className="flex items-center gap-2">
          {isSummarizing ? (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>{t("generating")}</span>
            </div>
          ) : summary ? (
            <>
              <button
                onClick={onCopy}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {copied ? t("copied") : t("copySummary")}
              </button>
              <button
                onClick={onDownload}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t("downloadSummary")}
              </button>
              <button
                onClick={onShare}
                disabled={sharingDocumentId === documentId}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {t("shareSummary")}
              </button>
            </>
          ) : null}
        </div>
      </div>
      
      {summary ? (
        <div className="prose prose-blue max-w-none bg-white dark:bg-gray-900 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
          <ReactMarkdown>{summary}</ReactMarkdown>
        </div>
      ) : (
        <div className="text-center py-8">
          {isSummarizing ? (
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
              <p className="text-blue-700 font-medium">{t("analyzing")}</p>
              <p className="text-blue-500 text-sm mt-1">{t("analyzingDesc")}</p>
              <button
                onClick={onCancel}
                className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                aria-label={t("cancel")}
              >
                {t("cancel")}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-500">{t("summaryHere")}</p>
              <Link 
                href="/help" 
                className="text-sm text-blue-600 hover:underline"
              >
                {t("needHelp")}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default SummaryDisplay;
