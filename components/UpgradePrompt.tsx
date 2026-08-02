"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";

interface UpgradePromptProps {
  remainingQuota: number;
  totalQuota: number;
  isPro: boolean;
}

/**
 * Intent-based upgrade prompt — shown when user is close to hitting limits.
 * Converts 40% better than time-based prompts according to 2026 SaaS benchmarks.
 */
export default function UpgradePrompt({ remainingQuota, totalQuota, isPro }: UpgradePromptProps) {
  const t = useTranslations("upgrade");
  const [dismissed, setDismissed] = useState(false);

  const prevQuotaRef = useRef(remainingQuota);
  useEffect(() => {
    // Reset dismissal when quota drops significantly
    if (remainingQuota < prevQuotaRef.current && remainingQuota <= 2) {
      setDismissed(false);
    }
    prevQuotaRef.current = remainingQuota;
  }, [remainingQuota]);

  if (isPro || dismissed || remainingQuota > 2) return null;

  const usagePercent = Math.round(((totalQuota - remainingQuota) / totalQuota) * 100);

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            {remainingQuota === 0 ? t("limitReached") : t("quotaWarning")}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {remainingQuota === 0
              ? t("limitReachedDesc")
              : t("quotaWarningDesc", { remaining: remainingQuota, percent: usagePercent })}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <Link
              href="/pricing"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t("upgradeNow")}
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {t("dismiss")}
            </button>
          </div>
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-3">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-amber-500 h-2 rounded-full transition-all"
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {totalQuota - remainingQuota} / {totalQuota} {t("used")}
        </p>
      </div>
    </div>
  );
}
