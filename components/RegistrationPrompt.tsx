"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";

/**
 * RegistrationPrompt — shows after a guest uploads a PDF on the homepage.
 * Appears with a slight delay after upload completion to avoid interrupting
 * the summary preview. Dismissible by the user.
 */
export default function RegistrationPrompt({ show }: { show: boolean }) {
  const t = useTranslations("guest");
  const [dismissed, setDismissed] = useState(false);
  const [delayed, setDelayed] = useState(false);

  useEffect(() => {
    if (show && !dismissed) {
      const timer = setTimeout(() => setDelayed(true), 2500);
      return () => {
        clearTimeout(timer);
        setDelayed(false);
      };
    }
  }, [show, dismissed]);

  if (!show || dismissed || !delayed) return null;

  return (
    <div className="mt-6 animate-fade-in-up" role="alert" aria-live="polite">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{t("createAccountTitle")}</p>
            <p className="text-gray-600 text-sm mt-1">{t("createAccountDesc")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/sign-up"
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            {t("signUpCta")}
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="p-2 text-gray-500 hover:text-gray-700 transition"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
