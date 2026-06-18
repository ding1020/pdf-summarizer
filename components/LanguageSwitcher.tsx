"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
];

export default function LanguageSwitcher() {
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const switchTo = (newLocale: string) => {
    setOpen(false);
    if (newLocale === locale) return;

    // Set cookie so middleware remembers preference
    document.cookie =
      `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;

    // Full navigation: ensures cookie is sent to server and middleware
    // redirects based on it. More reliable than client-side router.push
    // which may conflict with next-intl locale prefixing.
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts.length > 0 && languages.some((l) => l.code === parts[0])) {
      parts[0] = newLocale;
    } else {
      parts.unshift(newLocale);
    }
    window.location.href = "/" + parts.join("/") + window.location.search;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors rounded-lg"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">
          {languages.find((l) => l.code === locale)?.name ?? "English"}
        </span>
      </button>

      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => switchTo(lang.code)}
                className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                  locale === lang.code
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-700"
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
