"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface FeedbackButtonsProps {
  documentId?: string;
  className?: string;
}

/**
 * Quick 👍👎 feedback buttons for summary results.
 * Sends feedback to /api/feedback without requiring a modal.
 */
export default function FeedbackButtons({ documentId, className = "" }: FeedbackButtonsProps) {
  const t = useTranslations("upload");
  const [sent, setSent] = useState<"up" | "down" | null>(null);
  const [sending, setSending] = useState(false);

  const handleFeedback = async (rating: "up" | "down") => {
    if (sent || sending) return;
    setSending(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "general",
          message: `Summary ${rating === "up" ? "helpful" : "not helpful"}${documentId ? ` (doc: ${documentId})` : ""} - Quick rating`,
        }),
      });
      setSent(rating);
    } catch {
      // Silent fail for feedback
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-xs text-gray-400 mr-1">{t("wasThisHelpful") || "Helpful?"}</span>
      <button
        onClick={() => handleFeedback("up")}
        disabled={!!sent || sending}
        className={`p-1.5 rounded-lg transition-colors ${
          sent === "up"
            ? "bg-green-100 text-green-600"
            : "text-gray-400 hover:text-green-600 hover:bg-green-50"
        }`}
        aria-label={t("thumbsUp") || "Thumbs up"}
        title={t("thumbsUp") || "Thumbs up"}
      >
        <svg className="w-4 h-4" fill={sent === "up" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
        </svg>
      </button>
      <button
        onClick={() => handleFeedback("down")}
        disabled={!!sent || sending}
        className={`p-1.5 rounded-lg transition-colors ${
          sent === "down"
            ? "bg-red-100 text-red-600"
            : "text-gray-400 hover:text-red-600 hover:bg-red-50"
        }`}
        aria-label={t("thumbsDown") || "Thumbs down"}
        title={t("thumbsDown") || "Thumbs down"}
      >
        <svg className="w-4 h-4" fill={sent === "down" ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
        </svg>
      </button>
      {sent && (
        <span className="text-xs text-gray-400 ml-1">{t("thanks") || "Thanks!"}</span>
      )}
    </div>
  );
}
