"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface PaymentModalProps {
  plan: "pro_monthly" | "pro_yearly";
  amount: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function PaymentModal({ plan, amount, isOpen, onClose }: PaymentModalProps) {
  const t = useTranslations("pricing");
  const [creemLoading, setCreemLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setError("");

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isYearly = plan === "pro_yearly";

  const handleCreemCheckout = async () => {
    if (creemLoading) return;
    setCreemLoading(true);
    setError("");

    try {
      const priceId =
        isYearly
          ? process.env.NEXT_PUBLIC_CREEM_PRICE_YEARLY
          : process.env.NEXT_PUBLIC_CREEM_PRICE_MONTHLY;

      if (!priceId) {
        setError(t("errors.notConfigured"));
        return;
      }

      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, planType: plan }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("errors.generic"));
        return;
      }

      window.location.href = data.url;
    } catch {
      setError(t("errors.generic"));
    } finally {
      setCreemLoading(false);
    }
  };

  const planLabel = isYearly ? t("modal.yearly") : t("modal.monthly");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <div className="flex justify-end p-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close payment modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-8">
          <h3 id="payment-modal-title" className="text-xl font-bold text-gray-900 mb-1">
            {planLabel} — {amount}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Secure payment powered by Creem. Cards & digital wallets accepted.
          </p>

          {/* Plan details */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 mb-6 border border-blue-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">PDF Summarizer Pro</p>
                <p className="text-xs text-gray-500">
                  {isYearly ? "Billed yearly · Save ~28%" : "Billed monthly"}
                </p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                Unlimited AI summaries
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                Up to 50,000 characters per document
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                Download summaries as Markdown
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                Cancel anytime
              </li>
            </ul>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Pay button */}
          <button
            onClick={handleCreemCheckout}
            disabled={creemLoading}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
          >
            {creemLoading ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75"/>
                </svg>
                {t("processing")}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                </svg>
                {t("modal.payNow") || "Pay"} {amount}
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-400 mt-4">
            Powered by Creem. Visa, Mastercard, Amex & more.
          </p>
        </div>
      </div>
    </div>
  );
}
