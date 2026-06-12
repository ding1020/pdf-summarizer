"use client";

import { useState } from "react";
import { usePathname, useRouter } from "@/navigation";
import { useLocale, useTranslations } from "next-intl";
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
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  const handleChange = (newLocale: string) => {
    setOpen(false);
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="relative" onBlur={(e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
    }}>
      <button
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors rounded-lg"
        aria-label={t("common.selectLanguage")}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen(!open)}
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{languages.find(l => l.code === locale)?.name}</span>
      </button>
      
      <div
        className={`absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 transition-all z-50 ${
          open ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        role="listbox"
      >
        <div className="py-1">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              role="option"
              aria-selected={locale === lang.code}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                locale === lang.code ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
