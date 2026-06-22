import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import FileUploadWrapper from "./FileUploadWrapper";
import AuthDependentUI from "./AuthUI";
import GuestBanner from "./GuestBanner";
import SubscriptionWidget from "@/components/SubscriptionWidget";

// ── Auth UI Skeleton (shown while Clerk loads) ──
function AuthUISkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 bg-gray-100 animate-pulse rounded-lg w-32" />
      <div className="h-10 bg-gray-100 animate-pulse rounded-lg w-24" />
    </div>
  );
}

// Server Component: always renders. Client components handle auth state internally.
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const ct = await getTranslations();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors" id="main-content">
      {/* Guest Header (shown when not signed in) */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                {ct("guest.welcomeTitle")}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{ct("guest.welcomeDesc")}</p>
            </div>
            {/* Auth-dependent UI wrapped in Suspense for graceful loading */}
            <Suspense fallback={<AuthUISkeleton />}>
              <AuthDependentUI refreshKey={0} />
            </Suspense>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Subscription Widget */}
        <Suspense fallback={null}>
          <SubscriptionWidget />
        </Suspense>

        {/* Guest Banner — only shown when NOT signed in */}
        <Suspense fallback={null}>
          <GuestBanner />
        </Suspense>

        {/* Upload Section */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 md:p-8 mb-8 transition-colors">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t("uploadTitle")}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("uploadSubtitle")}</p>
            </div>
          </div>
          <FileUploadWrapper />
        </div>

        {/* Quick Tips */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl p-5 border border-blue-100 dark:border-blue-900">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{t("tips.results")}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t("tips.resultsDesc")}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-xl p-5 border border-green-100 dark:border-green-900">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{t("tips.secure")}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t("tips.secureDesc")}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}