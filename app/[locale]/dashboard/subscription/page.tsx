"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

interface SubscriptionData {
  subscriptionStatus: string;
  subscriptionEndDate: string | null;
  paddleSubscriptionId: string | null;
  billingCycle: string | null;
}

export default function SubscriptionPage() {
  const t = useTranslations("subscription");
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  useEffect(() => {
    if (isSignedIn) {
      fetchSubscriptionStatus();
    } else {
      setLoadingSubscription(false);
    }
  }, [isSignedIn]);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch("/api/subscription");
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch {
      // Silently handle — user sees loading state resolve
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage({ type: "error", text: data.error || t("errorPortal") });
      }
    } catch {
      setMessage({ type: "error", text: t("errorGeneric") });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage({ type: "error", text: data.error || t("errorPaymentConfig") });
      }
    } catch {
      setMessage({ type: "error", text: t("errorGeneric") });
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loadingSubscription) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    router.push("/sign-in");
    return null;
  }

  const isPro = subscription?.subscriptionStatus === "pro";
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@pdfsum.com";

  return (
    <div className="min-h-[80vh] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
            <p className="text-blue-100 mt-1">{t("subtitle")}</p>
          </div>

          <div className="p-8">
            {message && (
              <div
                className={`mb-6 p-4 rounded-lg ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="space-y-6">
              {/* Current Plan */}
              <div className="border rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("currentPlan")}</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {isPro ? t("planPro") : t("planFree")}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      {isPro 
                        ? subscription?.billingCycle === "year" 
                          ? t("billedAnnually")
                          : t("billedMonthly")
                        : t("freeLimit")
                      }
                    </p>
                    {isPro && subscription?.subscriptionEndDate && (
                      <p className="text-gray-500 text-xs mt-1">
                        {t("renews")}: {new Date(subscription.subscriptionEndDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isPro 
                      ? "bg-blue-100 text-blue-700" 
                      : "bg-green-100 text-green-700"
                  }`}>
                    {t("statusActive")}
                  </span>
                </div>
              </div>

              {/* Upgrade Option - Only show for free users */}
              {!isPro && (
                <div className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                      {t("savePercent")}
                    </span>
                    <span className="text-sm text-gray-500 line-through">$108/year</span>
                    <span className="text-lg font-bold text-gray-900">$79/year</span>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">{t("upgradeTitle")}</h2>
                  <p className="text-gray-600 mb-4">
                    {t("upgradeDesc")}
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-3xl font-bold text-gray-900">$9</span>
                      <span className="text-gray-500">{t("perMonth")}</span>
                    </div>
                    <button
                      onClick={handleUpgrade}
                      disabled={loading}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? t("processing") : t("upgradeButton")}
                    </button>
                  </div>
                </div>
              )}

              {/* Billing Portal */}
              <div className="border rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">{t("billingTitle")}</h2>
                <p className="text-gray-600 mb-4">
                  {t("billingDesc")}
                </p>
                <button
                  onClick={handleManageSubscription}
                  disabled={loading}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {t("billingButton")}
                </button>
              </div>

              {/* Danger Zone - Only show for pro users */}
              {isPro && (
                <div className="border border-red-200 rounded-xl p-6 bg-red-50">
                  <h2 className="text-lg font-semibold text-red-700 mb-2">{t("cancelTitle")}</h2>
                  <p className="text-gray-600 mb-4">
                    {t("cancelDesc")}
                  </p>
                  <button
                    onClick={handleManageSubscription}
                    disabled={loading}
                    className="px-6 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {t("cancelButton")}
                  </button>
                </div>
              )}
            </div>

            {/* Help Text */}
            <p className="text-center text-gray-500 text-sm mt-8">
              {t("helpText")}{" "}
              <a href={`mailto:${supportEmail}`} className="text-blue-600 hover:underline">
                {supportEmail}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
