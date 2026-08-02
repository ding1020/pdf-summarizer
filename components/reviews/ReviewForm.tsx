"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { StarRating } from "./StarRating";

interface ReviewFormProps {
  onSubmit: (data: { rating: number; title: string; content: string }) => Promise<void>;
}

export default function ReviewForm({ onSubmit }: ReviewFormProps) {
  const t = useTranslations("reviews");
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await onSubmit({ rating, title, content });
      setSuccess(true);
      setRating(0);
      setTitle("");
      setContent("");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <h3 className="font-semibold text-green-900">{t("thankYou")}</h3>
        <p className="text-green-700 text-sm mt-1">{t("reviewSubmitted")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">{t("writeReview")}</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">{t("yourRating")}</label>
        <StarRating rating={rating} size="lg" interactive onRate={setRating} />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">{t("title")}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t("titlePlaceholder")}
          maxLength={100}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">{t("review")}</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          placeholder={t("reviewPlaceholder")}
          maxLength={1000}
          required
        />
        <p className="text-xs text-gray-400 mt-1">{content.length}/1000</p>
      </div>

      <button
        type="submit"
        disabled={rating === 0 || submitting}
        className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? t("submitting") : t("submitReview")}
      </button>
    </form>
  );
}
