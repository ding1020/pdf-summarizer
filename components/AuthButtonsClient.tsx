"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { useState, useEffect } from "react";

// ── Guest buttons (always safe, no Clerk dependency) ──
function GuestButtons({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex items-center gap-4">
      <Link href="/sign-in" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
        {t("common.signIn")}
      </Link>
      <Link href="/sign-up" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
        {t("common.signUp")}
      </Link>
    </div>
  );
}

// ── Auth-aware content (only after ClerkProvider is ready) ──
function AuthContent({ t }: { t: ReturnType<typeof useTranslations> }) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-4">
        <div className="h-9 w-20 bg-gray-100 animate-pulse rounded-lg" />
        <div className="h-9 w-20 bg-gray-100 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <GuestButtons t={t} />;
  }

  return (
    <div className="flex items-center gap-4">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        {t("nav.dashboard")}
      </Link>
      <UserButton />
    </div>
  );
}

// ── Exported component for dynamic import ──
export default function AuthButtonsClient() {
  const t = useTranslations();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Before hydration: show guest buttons (no Clerk hooks)
  if (!mounted) {
    return <GuestButtons t={t} />;
  }

  return <AuthContent t={t} />;
}
