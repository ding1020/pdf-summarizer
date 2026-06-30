"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";

interface SubscriptionData {
  subscriptionStatus: string;
  subscriptionEndDate: string | null;
  billingCycle: string | null;
  usageCount: number;
  usageLimit: number;
}

export default function SubscriptionWidget() {
  const { isSignedIn } = useAuth();
  const t = useTranslations("subscription");
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  const openBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/customer-portal");
      const body = await res.json();
      if (body.url) {
        window.open(body.url, "_blank");
      } else {
        alert(body.error || "Unable to open billing portal. Please try again.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };

  useEffect(() => {
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const [subRes, usageRes] = await Promise.all([
          fetch("/api/subscription"),
          fetch("/api/usage"),
        ]);
        const sub = subRes.ok ? await subRes.json() : null;
        const usage = usageRes.ok ? await usageRes.json() : null;

        setData({
          subscriptionStatus: sub?.subscriptionStatus || "free",
          subscriptionEndDate: sub?.subscriptionEndDate || null,
          billingCycle: sub?.billingCycle || null,
          usageCount: usage?.used || 0,
          usageLimit: sub?.subscriptionStatus === "pro" || sub?.subscriptionStatus === "pro_trial" ? -1 : (usage?.limit || 5),
        });
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isSignedIn]);

  if (!isSignedIn || loading) return null;
  if (!data) return null;

  const isPro = data.subscriptionStatus === "pro" || data.subscriptionStatus === "pro_trial";
  const isTrial = data.subscriptionStatus === "pro_trial";
  const usagePercent = isPro || data.usageLimit <= 0 ? 0 : Math.min((data.usageCount / data.usageLimit) * 100, 100);
  const endDate = data.subscriptionEndDate
    ? new Date(data.subscriptionEndDate).toLocaleDateString()
    : null;
  const planLabel = isTrial
    ? "🕒 Pro Trial"
    : isPro
    ? `Pro ${data.billingCycle === "yearly" ? "Yearly" : "Monthly"}`
    : "Free";
  const statusColor = isTrial
    ? "bg-purple-100 text-purple-700 border-purple-200"
    : isPro
    ? "bg-green-100 text-green-700 border-green-200"
    : "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
          {t("planTitle") || "Your Plan"}
        </h3>
        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${statusColor}`}>
          {planLabel}
        </span>
      </div>

      {/* Usage bar (free users only) */}
      {!isPro && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>
              {data.usageCount} / {data.usageLimit} summaries today
            </span>
            <span>{Math.round(usagePercent)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                usagePercent > 80
                  ? "bg-red-500"
                  : usagePercent > 50
                  ? "bg-yellow-500"
                  : "bg-blue-600"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Trial info */}
      {isTrial && (
        <div className="mb-4 p-3 bg-purple-50 border border-purple-100 rounded-lg">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-purple-700 font-medium">🕒 Trial ends</span>
            <span className="text-purple-700">{endDate}</span>
          </div>
          <div className="text-xs text-purple-600">
            {t("trialMessage") || "You have full Pro access during the trial. Upgrade to keep it!"}
          </div>
        </div>
      )}

      {/* Pro info */}
      {isPro && !isTrial && (
        <div className="space-y-2 mb-4">
          {endDate && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t("renewalDate") || "Renewal date"}</span>
              <span className="text-gray-900 font-medium">{endDate}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t("usage") || "Usage"}</span>
            <span className="text-green-600 font-medium">{t("unlimited") || "Unlimited"}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!isPro ? (
          <Link
            href="/pricing"
            className="flex-1 text-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            {t("upgrade") || "Upgrade to Pro"}
          </Link>
        ) : (
          <>
            <Link
              href="/dashboard/subscription"
              className="flex-1 text-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
            >
              {t("manageSub") || "Manage Subscription"}
            </Link>
            <button
              onClick={openBillingPortal}
              disabled={portalLoading}
              className="flex-1 text-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {portalLoading ? "..." : t("billingButton") || "Billing Portal"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
