"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/navigation";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// ── Dynamic import: Clerk auth buttons (client-only, no SSR) ──
const AuthButtonsClient = dynamic(
  () => import("./AuthButtonsClient"),
  { ssr: false }
);

function LoadingSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <div className="h-9 w-20 bg-gray-100 animate-pulse rounded-lg" />
      <div className="h-9 w-24 bg-gray-100 animate-pulse rounded-lg" />
    </div>
  );
}

// ── Main Navigation ──
export default function Navigation() {
  const t = useTranslations();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile menu on Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (path: string) => {
    if (path === "/pricing") return pathname === "/pricing" || pathname.startsWith("/pricing");
    if (path === "/help") return pathname === "/help" || pathname.startsWith("/help");
    return pathname === "/" || pathname.includes(path);
  };

  const navLinks = [
    { href: "/#features", label: t("nav.features") },
    { href: "/pricing", label: t("nav.pricing") },
    { href: "/help", label: t("nav.help") },
    { href: "/#how-it-works", label: t("nav.howItWorks") },
  ];

  return (
    <nav className="bg-white border-b" aria-label="Main navigation">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2" aria-label="PDF Summary - Home">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="font-bold text-lg text-gray-900">{t("common.brand")}</span>
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    isActive(link.href.replace("/#", "/")) ? "text-blue-600" : "text-gray-600 hover:text-gray-900"
                  }`}
                  aria-current={isActive(link.href.replace("/#", "/")) ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex">
            <Suspense fallback={<LoadingSkeleton />}>
              <AuthButtonsClient />
            </Suspense>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-haspopup="menu"
            aria-controls="mobile-menu"
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay + Drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed top-16 left-0 right-0 bg-white border-b shadow-lg z-50 md:hidden animate-slide-in"
            id="mobile-menu"
            role="dialog"
            aria-label="Mobile navigation menu"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive(link.href.replace("/#", "/"))
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-gray-100 mt-3 px-3">
                <Suspense fallback={<LoadingSkeleton />}>
                  <AuthButtonsClient />
                </Suspense>
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
