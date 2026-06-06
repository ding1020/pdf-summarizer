"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";

const COOKIE_CONSENT_KEY = "pdfsum_cookie_consent";

export default function CookieConsent() {
  const t = useTranslations("cookies");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Respect Do Not Track (DNT) header — auto-accept essential-only
    const dnt = navigator.doNotTrack === "1" || (window as any).doNotTrack === "1";
    const consented = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (dnt && !consented) {
      localStorage.setItem(COOKIE_CONSENT_KEY, "essential");
      return;
    }
    if (!consented) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "all");
    setVisible(false);
  };

  const acceptEssential = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "essential");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-in">
      <div className="bg-white border-t border-gray-200 shadow-2xl">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Cookie icon + text */}
            <div className="flex items-start gap-3 flex-1">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{t("title")}</p>
                <p className="text-xs text-gray-500 mt-0.5 max-w-xl">
                  {t("description")}{" "}
                  <Link href="/cookies" className="text-blue-600 hover:underline">
                    {t("learnMore")}
                  </Link>
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={acceptEssential}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t("essentialOnly")}
              </button>
              <button
                onClick={acceptAll}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t("acceptAll")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
