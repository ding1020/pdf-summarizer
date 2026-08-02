"use client";

import { useTranslations } from "next-intl";
import { StarRating } from "./StarRating";

interface Review {
  id: string;
  userName: string;
  rating: number;
  title?: string | null;
  content: string;
  createdAt: string | Date;
  adminReply?: string | null;
}

interface ReviewCardProps {
  review: Review;
  locale: string;
}

export default function ReviewCard({ review, locale }: ReviewCardProps) {
  const t = useTranslations("reviews");
  const date = new Date(review.createdAt).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
            {review.userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900">{review.userName}</p>
            <p className="text-xs text-gray-400">{date}</p>
          </div>
        </div>
        <StarRating rating={review.rating} />
      </div>

      {review.title && (
        <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
      )}

      <p className="text-gray-600 text-sm leading-relaxed">{review.content}</p>

      {review.adminReply && (
        <div className="mt-4 bg-gray-50 rounded-lg p-3 border-l-4 border-blue-400">
          <p className="text-xs font-medium text-gray-500 mb-1">{t("adminReply")}</p>
          <p className="text-sm text-gray-700">{review.adminReply}</p>
        </div>
      )}
    </div>
  );
}
