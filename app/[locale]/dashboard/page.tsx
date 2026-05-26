"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useClerk } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import FileUpload from "@/components/FileUpload";
import DocumentHistory from "@/components/DocumentHistory";

interface UsageData {
  used: number;
  limit: number;
  remaining: number;
  isPro: boolean;
  resetAt: string | null;
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [refreshKey, setRefreshKey] = useState(0);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);

  // Fetch usage stats when signed in
  useEffect(() => {
    if (isSignedIn) {
      fetchUsage();
    } else {
      setLoadingUsage(false);
    }
  }, [isSignedIn, refreshKey]);

  const fetchUsage = async () => {
    try {
      const response = await fetch("/api/usage");
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      } else if (response.status === 401) {
        // Session expired, redirect to sign-in
        signOut(() => { window.location.href = "/sign-in"; });
        return;
      }
    } catch (error) {
      console.error("Failed to fetch usage:", error);
    } finally {
      setLoadingUsage(false);
    }
  };

  const handleUploadComplete = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleSignOut = () => {
    signOut(() => { window.location.href = "/"; });
  };

  // Loading state from Clerk
  if (!isUserLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t("welcome")}</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t("signInRequired")}</h1>
          <p className="text-gray-600 mb-6">{t("signInDesc")}</p>
          <Link
            href="/sign-in"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            {t("common.signIn")}
          </Link>
        </div>
      </div>
    );
  }

  const displayName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {t("welcome")}, {displayName}
              </h1>
              <p className="text-gray-600 mt-1">
                {t("subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Usage Badge */}
              {loadingUsage ? (
                <div className="bg-gray-100 px-4 py-2 rounded-lg animate-pulse">
                  <div className="h-4 w-20 bg-gray-200 rounded"></div>
                </div>
              ) : usage?.isPro ? (
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Pro - Unlimited
                </div>
              ) : usage ? (
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {usage.used}/{usage.limit} summaries today
                    {usage.remaining === 0 && (
                      <Link href="/pricing" className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700">
                        Upgrade
                      </Link>
                    )}
                  </span>
                </div>
              ) : null}
              
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Usage Progress Bar */}
        {!loadingUsage && usage && !usage.isPro && usage.limit > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Daily Usage</span>
              <span className="text-sm text-gray-500">
                {usage.used} of {usage.limit} used
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  usage.remaining === 0 
                    ? "bg-red-500" 
                    : usage.used >= usage.limit * 0.8 
                      ? "bg-yellow-500" 
                      : "bg-blue-600"
                }`}
                style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }}
              ></div>
            </div>
            {usage.remaining === 0 && (
              <p className="text-xs text-red-600 mt-2">
                You&apos;ve reached your daily limit. Upgrade to Pro for unlimited summaries.
              </p>
            )}
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t("uploadTitle")}</h2>
              <p className="text-sm text-gray-500">{t("uploadSubtitle")}</p>
            </div>
          </div>
          <FileUpload onUploadComplete={handleUploadComplete} />
        </div>

        {/* Quick Tips */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{t("tips.results")}</h3>
                <p className="text-sm text-gray-600">{t("tips.resultsDesc")}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{t("tips.secure")}</h3>
                <p className="text-sm text-gray-600">{t("tips.secureDesc")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* History Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t("historyTitle")}</h2>
              <p className="text-sm text-gray-500">{t("historySubtitle")}</p>
            </div>
          </div>
          <DocumentHistory key={refreshKey} />
        </div>
      </div>
    </div>
  );
}
