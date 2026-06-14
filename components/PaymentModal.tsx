"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface PaymentModalProps {
  plan: "pro_monthly" | "pro_yearly";
  amount: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function PaymentModal({ plan, amount, isOpen, onClose }: PaymentModalProps) {
  const t = useTranslations("pricing");
  const [channel, setChannel] = useState<"alipay" | "wechat">("alipay");
  const [txnRef, setTxnRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const isYearly = plan === "pro_yearly";

  const handleSubmit = async () => {
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

  const planLabel = isYearly ? t("modal.yearly") : t("modal.monthly");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <div className="flex justify-end p-4">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {submitted ? (
          /* Success state */
          <div className="px-6 pb-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t("modal.successTitle")}</h3>
            <p className="text-gray-600 mb-6">{t("modal.successDesc")}</p>
            <button
              onClick={onClose}
              className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t("modal.gotIt")}
            </button>
          </div>
        ) : (
          /* Payment form */
          <div className="px-6 pb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
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

            {/* QR code placeholder */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6 text-center border-2 border-dashed border-gray-300">
              <p className="text-gray-400 text-sm mb-1">{t("modal.qrPlaceholder")}</p>
              <p className="text-gray-300 text-xs">
                {t("modal.qrHint")}
              </p>
              <div className="mt-3 text-xs text-gray-400">
                {t("modal.amountLabel")}: <span className="font-bold text-gray-600 text-base">{amount}</span>
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
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? t("submitting") : t("modal.submit")}
            </button>

            <p className="text-center text-xs text-gray-400 mt-4">
              {t("modal.notice")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
