"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ReviewCard from "./ReviewCard";

interface Review {
  id: string;
  userName: string;
  rating: number;
  title?: string | null;
  content: string;
  createdAt: string | Date;
  adminReply?: string | null;
}

interface ReviewListProps {
  reviews: Review[];
  locale: string;
}

export default function ReviewList({ reviews, locale }: ReviewListProps) {
  const t = useTranslations("reviews");
  const [filter, setFilter] = useState<"all" | "positive" | "critical">("all");
  const [sort, setSort] = useState<"newest" | "highest" | "lowest">("newest");

  const filtered = reviews.filter((r) => {
    if (filter === "positive") return r.rating >= 4;
    if (filter === "critical") return r.rating <= 2;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sort === "highest") return b.rating - a.rating;
    return a.rating - b.rating;
  });

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  return (
    <div>
      {/* Stats */}
      <div className="bg-blue-50 rounded-xl p-6 mb-8 flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold text-gray-900">{avgRating}</p>
          <p className="text-sm text-gray-500">{t("outOf5")} · {reviews.length} {t("reviews")}</p>
        </div>
        <div className="flex gap-2">
          {(["all", "positive", "critical"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t(`filter.${f}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="flex justify-end mb-4">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="newest">{t("sort.newest")}</option>
          <option value="highest">{t("sort.highest")}</option>
          <option value="lowest">{t("sort.lowest")}</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-4">
        {sorted.map((review) => (
          <ReviewCard key={review.id} review={review} locale={locale} />
        ))}
        {sorted.length === 0 && (
          <p className="text-center text-gray-500 py-8">{t("noReviews")}</p>
        )}
      </div>
    </div>
  );
}
