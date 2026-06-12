"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import DocumentHistory from "@/components/DocumentHistory";
import OnboardingGuide from "@/components/OnboardingGuide";

interface UsageData {
  used: number;
  limit: number;
  remaining: number;
  isPro: boolean;
  resetAt: string | null;
}

export default function AuthDependentUI({ refreshKey }: { refreshKey: number }) {
  const t = useTranslations("dashboard");
  const ct = useTranslations();
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [clerkTimedOut, setClerkTimedOut] = useState(false);

  // Timeout guard
  useEffect(() => {
    if (isUserLoaded) {
      setClerkTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setClerkTimedOut(true), 3000);
    return () => clearTimeout(timer);
  }, [isUserLoaded]);

  const fetchUsage = useCallback(async () => {
    try {
      const response = await fetch("/api/usage");
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch {
      // Silently handle — usage bar will just not render
    } finally {
      setLoadingUsage(false);
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      fetchUsage();
    } else {
      setLoadingUsage(false);
    }
  }, [isSignedIn, refreshKey, fetchUsage]);

  const displayName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || ct("common.brand");

  // === Clerk still loading ===
  if (!isUserLoaded && !clerkTimedOut) {
    return (
      <div className="h-10 bg-gray-100 animate-pulse rounded-lg w-40 inline-block"></div>
    );
  }

  // === Guest mode ===
  if (!isSignedIn || clerkTimedOut) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{ct("guest.tryForFree")}</span>
        <Link
          href="/sign-up"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
        >
          {ct("common.signUp")}
        </Link>
        <Link
          href="/sign-in"
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
        >
          {ct("common.signIn")}
        </Link>
      </div>
    );
  }

  // === Signed-in: full header + usage + history ===
  return (
    <>
      {/* Onboarding guide for first-time users */}
      <OnboardingGuide />

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {t("welcome")}, {displayName}
              </h1>
              <p className="text-gray-600 mt-1">{t("subtitle")}</p>
            </div>
            <div className="flex items-center gap-4">
              {loadingUsage ? (
                <div className="bg-gray-100 px-4 py-2 rounded-lg animate-pulse">
                  <div className="h-4 w-20 bg-gray-200 rounded"></div>
                </div>
              ) : usage?.isPro ? (
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t("proUnlimited")}
                </div>
              ) : usage ? (
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
                  {t("summariesToday", { used: usage.used, limit: usage.limit })}
                  {usage.remaining === 0 && (
                    <Link href="/pricing" className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700">
                      {t("upgrade")}
                    </Link>
                  )}
                </div>
              ) : null}
              <button
                onClick={() => signOut(() => { window.location.href = "/"; })}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t("signOut")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Bar */}
      {!loadingUsage && usage && !usage.isPro && usage.limit > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{t("dailyUsage")}</span>
            <span className="text-sm text-gray-500">
              {t("xOfYUsed", { used: usage.used, limit: usage.limit })}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                usage.remaining === 0 ? "bg-red-500" : usage.used >= usage.limit * 0.8 ? "bg-yellow-500" : "bg-blue-600"
              }`}
              style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 mb-8">
        <DocumentHistory key={refreshKey} />
      </div>
    </>
  );
}
