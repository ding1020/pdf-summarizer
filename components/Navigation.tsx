"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/navigation";
import { useState, useEffect } from "react";

export default function Navigation() {
  const t = useTranslations();
  const pathname = usePathname();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check if user is signed in via Clerk cookie OR demo mode localStorage
    const checkAuth = async () => {
      try {
        // Check demo mode first
        const demoUser = localStorage.getItem("demo_user");
        if (demoUser) {
          setIsSignedIn(true);
          return;
        }
        
        // Check Clerk session cookie
        const cookies = document.cookie.split(';');
        const clerkCookie = cookies.find(c => c.trim().startsWith('__session'));
        if (clerkCookie) {
          setIsSignedIn(true);
        }
      } catch (e) {
        // Auth check failed
      }
    };
    
    checkAuth();
  }, []);

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
              Help
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

          {/* Auth Buttons - Simple links, no Clerk dependency */}
          <div className="flex items-center gap-4">
            {mounted && isSignedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {t("nav.dashboard")}
                </Link>
                <Link
                  href="/dashboard/subscription"
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t("dashboard.subscription") || "Subscription"}
                </Link>
                <button
                  onClick={() => {
                    // Clear Clerk session if available
                    try {
                      window.Clerk?.signOut();
                    } catch (e) {}
                    // Fallback: clear cookies and reload
                    document.cookie = "__session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
                    window.location.href = "/";
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {t("common.signIn")}
                </Link>
                <Link
                  href="/sign-up"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t("common.signUp")}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
