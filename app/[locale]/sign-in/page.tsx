"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, Link } from "@/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function SignInPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, isSignedIn, isLoaded } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Helper: read CSRF cookie and send as header
  const getCsrfHeader = (): Record<string, string> => {
    const csrfToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("__csrf_token="))
      ?.split("=")[1];
    return csrfToken ? { "X-CSRF-Token": csrfToken } : {};
  };

  // Respect redirect param from middleware (e.g., /pricing → /sign-in?redirect=/pricing)
  // Safety: only allow internal relative paths (prevent open redirect attacks)
  const redirectParam = searchParams.get("redirect") || "";
  const redirectTo = redirectParam.startsWith("/") && !redirectParam.startsWith("//")
    ? redirectParam
    : "/dashboard";

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push(redirectTo);
    }
  }, [isLoaded, isSignedIn, router, redirectTo]);

  // Handle URL error params from middleware redirects (e.g., ?error=expired_token)
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      const errorMessages: Record<string, string> = {
        rate_limit: "Too many verification attempts. Please try again later.",
        invalid_token: "Invalid verification link. Please request a new one.",
        expired_token: "This verification link has expired. Please sign up again or request a new one.",
        server_error: "A server error occurred during verification. Please try again.",
      };
      setError(errorMessages[urlError] || "Something went wrong. Please try again.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Normalize email before sending (matches server-side normalization)
    const normalizedEmail = email.trim().toLowerCase();
    const result = await signIn(normalizedEmail, password);
    if (result.success) {
      router.push(redirectTo);
    } else {
      setError(result.error || "Sign in failed");
      // Reset verification sent flag on new sign-in attempt
      setVerificationSent(false);
    }
    setLoading(false);
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    setVerificationSent(false);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setVerificationSent(true);
        setError("");
      } else {
        setError(data.error || "Failed to resend verification email.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResendingVerification(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isSignedIn) return null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4" id="main-content">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t("common.signIn")}</h1>
            <p className="text-gray-500 mt-1">{t("common.brand")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
                {error.includes("verify your email") && !verificationSent && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="block mt-2 text-blue-600 hover:text-blue-700 underline font-medium disabled:opacity-50"
                  >
                    {resendingVerification ? "Sending..." : "Resend verification email"}
                  </button>
                )}
              </div>
            )}
            {verificationSent && (
              <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">
                Verification email sent! Please check your inbox.
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition"
            >
              {loading ? t("common.loading") : t("common.signIn")}
            </button>

            <div className="text-right">
              <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Forgot password?
              </Link>
            </div>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" className="text-blue-600 hover:text-blue-700 font-medium">
              {t("common.signUp")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
