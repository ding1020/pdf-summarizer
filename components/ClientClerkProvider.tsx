"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useParams } from "next/navigation";

// Clerk locale mapping — follows app i18n languages
const CLERK_LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  zh: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
};

export default function ClientClerkProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const clerkLocale = CLERK_LOCALE_MAP[locale] || "en-US";

  return (
    <ClerkProvider
      afterSignOutUrl={`/${locale}/`}
      appearance={{
        variables: {
          // Match app's blue theme
          colorPrimary: "#2563eb",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
