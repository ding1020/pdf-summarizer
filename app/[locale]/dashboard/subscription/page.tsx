"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

interface SubscriptionData {
  subscriptionStatus: string;
  subscriptionEndDate: string | null;
  billingCycle: string | null;
}

export default function SubscriptionPage() {
  const t = useTranslations("subscription");
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [managingPortal, setManagingPortal] = useState(false);

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
      // silent
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleUpgrade = () => {
    router.push("/pricing");
  };

  const handleManageSubscription = async () => {
    setManagingPortal(true);
    try {
      const res = await fetch("/api/customer-portal");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to open subscription management.");
      }
    } catch {
      alert("Connection error. Please try again.");
    } finally {
      setManagingPortal(false);
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
  const supportEmail = "ding10201020@hotmail.com";

  return (
    <main className="min-h-[80vh] py-12 px-4" id="main-content">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
            <p className="text-blue-100 mt-1">{t("subtitle")}</p>
          </div>

          <div className="p-8">
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
                        ? subscription?.billingCycle === "yearly"
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

              {/* Upgrade Option */}
              {!isPro && (
                <div className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">{t("upgradeTitle")}</h2>
                  <p className="text-gray-600 mb-4">{t("upgradeDesc")}</p>
                  <button
                    onClick={handleUpgrade}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {t("upgradeButton")}
                  </button>
                </div>
              )}

              {/* Pro Info */}
              {isPro && (
                <div className="border rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">{t("billingTitle")}</h2>
                  <p className="text-gray-600 mb-4">{t("billingDesc")}</p>
                  <button
                    onClick={handleManageSubscription}
                    disabled={managingPortal}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {managingPortal ? t("processing") : t("billingButton")}
                  </button>
                  <p className="text-sm text-gray-500 mt-4">
                    {t("helpText")}{" "}
                    <a href={`mailto:${supportEmail}`} className="text-blue-600 hover:underline">
                      {supportEmail}
                    </a>
                  </p>
                </div>
              )}
            </div>

            <p className="text-center text-gray-500 text-sm mt-8">
              {t("helpText")}{" "}
              <a href={`mailto:${supportEmail}`} className="text-blue-600 hover:underline">
                {supportEmail}
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
