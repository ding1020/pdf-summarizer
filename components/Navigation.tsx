"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/navigation";
import { Suspense } from "react";
import dynamic from "next/dynamic";

// ── Lazy-load Clerk-dependent auth buttons ──
// NEVER import @clerk/nextjs at module level in this file — Clerk SDK
// top-level init tries clerk.pdfsum.com which has no SSL yet → 500.
// Dynamic import with ssr:false ensures the module is only loaded on
// the client after hydration.
const AuthButtonsClient = dynamic(() => import("./AuthButtonsClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-4">
      <div className="h-9 w-20 bg-gray-100 animate-pulse rounded-lg" />
      <div className="h-9 w-20 bg-gray-100 animate-pulse rounded-lg" />
    </div>
  ),
});

// ── Main Navigation ──
export default function Navigation() {
  const t = useTranslations();
  const pathname = usePathname();

  const isActive = (path: string) => pathname.includes(path);

  return (
    <nav className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="font-bold text-lg text-gray-900">{t("common.brand")}</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/#features"
              className={`text-sm font-medium transition-colors ${
                isActive("/features") ? "text-blue-600" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t("nav.features")}
            </Link>
            <Link
              href="/pricing"
              className={`text-sm font-medium transition-colors ${
                isActive("/pricing") ? "text-blue-600" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t("nav.pricing")}
            </Link>
            <Link
              href="/help"
              className={`text-sm font-medium transition-colors ${
                isActive("/help") ? "text-blue-600" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t("nav.help")}
            </Link>
            <Link
              href="/#how-it-works"
              className={`text-sm font-medium transition-colors ${
                isActive("/how-it-works") ? "text-blue-600" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t("nav.howItWorks")}
            </Link>
          </div>

          {/* Auth Buttons — dynamically loaded, SSRing-safe */}
          <Suspense fallback={<div className="h-9 w-40 bg-gray-100 animate-pulse rounded-lg" />}>
            <AuthButtonsClient />
          </Suspense>
        </div>
      </div>
    </nav>
  );
}
