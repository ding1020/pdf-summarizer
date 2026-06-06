"use client";

import { useTranslations } from "next-intl";

export default function Loading() {
  const t = useTranslations();
  return (
    <div className="min-h-screen bg-white">
      {/* Skeleton Header */}
      <div className="bg-gray-50 border-b py-2">
        <div className="max-w-6xl mx-auto px-4">
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse ml-auto" />
        </div>
      </div>
      {/* Skeleton Nav */}
      <div className="border-b">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="hidden md:flex gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
          <div className="flex gap-3">
            <div className="h-9 w-20 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-9 w-20 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
      {/* Skeleton Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-2/3 bg-gray-200 rounded mx-auto" />
          <div className="h-5 w-1/2 bg-gray-200 rounded mx-auto" />
          <div className="h-64 bg-gray-200 rounded-2xl mt-8" />
        </div>
      </div>
    </div>
  );
}
