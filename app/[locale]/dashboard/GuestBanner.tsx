"use client";

import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";

/**
 * GuestBanner — only renders when the user is NOT signed in.
 * Includes the info banner AND the bottom CTA section.
 */
export default function GuestBanner() {
  const { isSignedIn, isLoaded } = useAuth();
  const ct = useTranslations();

  // Don't show during loading to avoid flicker
  if (!isLoaded) return null;
  // Hide for signed-in users
  if (isSignedIn) return null;

  return (
    <>
      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-900 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-200 text-sm">{ct("guest.tryForFree")}</p>
            <p className="text-blue-600 dark:text-blue-400 text-xs mt-0.5">{ct("guest.signUpToSave")}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link
            href="/sign-up"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition whitespace-nowrap"
          >
            {ct("common.signUp")}
          </Link>
          <Link
            href="/sign-in"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition whitespace-nowrap"
          >
            {ct("common.signIn")}
          </Link>
        </div>
      </div>

      {/* Guest CTA */}
      <div className="text-center py-8 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
        <div className="max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{ct("guest.createAccountTitle")}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{ct("guest.createAccountDesc")}</p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {ct("common.getStarted")}
          </Link>
        </div>
      </div>
    </>
  );
}
