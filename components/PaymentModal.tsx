"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

interface PaymentModalProps {
  plan: "pro_monthly" | "pro_yearly";
  amount: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function PaymentModal({ plan, amount, isOpen, onClose }: PaymentModalProps) {
  const t = useTranslations("pricing");
  const locale = useLocale();
  const isZh = locale === "zh";

  // ── Chinese payment state (Alipay / WeChat) ──
  const [channel, setChannel] = useState<"alipay" | "wechat">("alipay");
  const [txnRef, setTxnRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ── Creem payment state (International) ──
  const [creemLoading, setCreemLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset state when modal opens; handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setSubmitted(false);
    setTxnRef("");

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isYearly = plan === "pro_yearly";

  // ── Chinese: manual Alipay/WeChat submission ──
  const handleSubmitCnPayment = async () => {
    if (submitting) return; // Guard against double-click
    if (!txnRef.trim()) {
      setError(t("modal.txnRefRequired"));
      return;
    }
    if (txnRef.trim().length < 4) {
      setError(t("modal.txnRefTooShort"));
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/payment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, channel, txnRef: txnRef.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || t("modal.submitError"));
      }
    } catch {
      setError(t("modal.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  // ── International: Creem one-click checkout ──
  const handleCreemCheckout = async () => {
    if (creemLoading) return; // Guard against double-click
    setCreemLoading(true);
    setError("");

    try {
      const priceId =
        isYearly
          ? process.env.NEXT_PUBLIC_CREEM_PRICE_YEARLY
          : process.env.NEXT_PUBLIC_CREEM_PRICE_MONTHLY;

      if (!priceId) {
        setError("Payment service not configured.");
        return;
      }

      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, planType: plan }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create payment session.");
        return;
      }

      // Redirect to Creem hosted checkout page
      window.location.href = data.url;
    } catch {
      setError("Connection error. Please try again.");
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

        {/* Success state */}
        {submitted ? (
          <div className="px-6 pb-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 id="payment-modal-title" className="text-xl font-bold text-gray-900 mb-2">{t("modal.successTitle")}</h3>
            <p className="text-gray-600 mb-6">{t("modal.successDesc")}</p>
            <button
              onClick={onClose}
              className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t("modal.gotIt")}
            </button>
          </div>

        /* ── 🇨🇳 Chinese: Alipay / WeChat + Manual Review ── */
        ) : isZh ? (
          <div className="px-6 pb-8">
            <h3 id="payment-modal-title" className="text-xl font-bold text-gray-900 mb-1">
              {planLabel} — {amount}
            </h3>
            <p className="text-sm text-gray-500 mb-6">{t("modal.subtitle")}</p>

            {/* Channel selector */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setChannel("alipay")}
                className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                  channel === "alipay"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {t("modal.alipay")}
              </button>
              <button
                onClick={() => setChannel("wechat")}
                className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                  channel === "wechat"
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {t("modal.wechat")}
              </button>
            </div>

            {/* QR Code */}
            <div className="bg-white rounded-xl p-6 mb-6 text-center border border-gray-200 shadow-sm">
              <img
                src={channel === "alipay" ? "/qrcodes/alipay.jpg" : "/qrcodes/wechat.jpg"}
                alt={channel === "alipay" ? "Alipay QR Code" : "WeChat Pay QR Code"}
                className="w-56 h-56 mx-auto rounded-lg"
              />
              <div className="mt-3 text-sm text-gray-600">
                {t("modal.amountLabel")}: <span className="font-bold text-gray-900 text-base">{amount}</span>
              </div>
            </div>

            {/* Transaction reference */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("modal.txnRefLabel")}
              </label>
              <input
                type="text"
                value={txnRef}
                onChange={(e) => setTxnRef(e.target.value)}
                placeholder={t("modal.txnRefPlaceholder")}
                maxLength={20}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1">{t("modal.txnRefHint")}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmitCnPayment}
              disabled={submitting}
              className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? t("submitting") : t("modal.submit")}
            </button>

            <p className="text-center text-xs text-gray-400 mt-4">
              {t("modal.notice")}
            </p>
          </div>

        /* ── 🌍 International: Creem One-Click Checkout ── */
        ) : (
          <div className="px-6 pb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
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
                  Priority processing & all export formats
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
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                  </svg>
                  Pay {amount} — Secure Checkout
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-400 mt-4">
              Powered by Creem. Visa, Mastercard, Amex & more.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
