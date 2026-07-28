"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trackNewsletterSignup } from "@/lib/analytics";

export default function NewsletterSignup({ locale }: { locale: string }) {
  const t = useTranslations("newsletter");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === "loading") return;

    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "homepage", locale }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.duplicate ? t("alreadySubscribed") : t("successMsg"));
        setEmail("");
        trackNewsletterSignup("homepage", locale);
      } else {
        setStatus("error");
        setMessage(data.error || t("errorMsg"));
      }
    } catch {
      setStatus("error");
      setMessage(t("errorMsg"));
    }
  }

  return (
    <section className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 py-16">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
          {t("title")}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {t("subtitle")}
        </p>

        {status === "success" ? (
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("placeholder")}
              required
              disabled={status === "loading"}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {status === "loading" ? t("subscribing") : t("subscribe")}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="mt-3 text-red-600 dark:text-red-400 text-sm">{message}</p>
        )}

        <p className="mt-4 text-xs text-gray-400">{t("privacyNote")}</p>
      </div>
    </section>
  );
}
