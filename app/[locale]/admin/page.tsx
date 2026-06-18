"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

interface PaymentRow {
  id: string;
  plan: string;
  amount: number;
  channel: string;
  txnRef: string | null;
  status: string;
  createdAt: string;
  user: { email: string; subscriptionStatus: string };
}

export default function AdminPage() {
  const t = useTranslations("admin");
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn) {
      fetchPayments();
    } else if (isLoaded) {
      router.push("/sign-in");
    }
  }, [isSignedIn, isLoaded]);

  const fetchPayments = async () => {
    try {
      const res = await fetch("/api/admin/pending");
      if (res.status === 403) {
        setError(t("forbidden"));
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.payments) setPayments(data.payments);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (paymentId: string, action: "approve" | "reject") => {
    setActionLoading(paymentId);
    try {
      const res = await fetch(`/api/admin/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      if (res.ok) {
        setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      }
    } catch {
      // silent
    } finally {
      setActionLoading(null);
    }
  };

  const formatAmount = (cents: number) => `¥${(cents / 100).toFixed(0)}`;
  const formatDate = (iso: string) => new Date(iso).toLocaleString("zh-CN");
  const planLabel = (plan: string) =>
    plan === "pro_monthly" ? t("planMonthly") : t("planYearly");
  const channelLabel = (channel: string) =>
    channel === "alipay" ? t("alipay") : channel === "wechat" ? t("wechat") : channel;

  if (!isLoaded || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSignedIn) return null;

  return (
    <main className="min-h-[80vh] py-8 px-4 max-w-4xl mx-auto" id="main-content">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-500 mt-1">{t("subtitle")}</p>
        </div>
        <button
          onClick={fetchPayments}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {t("refresh")}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {payments.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg">{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-gray-900">{p.user.email}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      p.user.subscriptionStatus === "pro"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {p.user.subscriptionStatus === "pro" ? "Pro" : "Free"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    <span className="font-semibold text-gray-700">{formatAmount(p.amount)}</span>
                    <span>·</span>
                    <span>{planLabel(p.plan)}</span>
                    <span>·</span>
                    <span>{channelLabel(p.channel)}</span>
                    {p.txnRef && (
                      <>
                        <span>·</span>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{t("txnRef")}: {p.txnRef}</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(p.createdAt)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAction(p.id, "approve")}
                    disabled={actionLoading === p.id}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === p.id ? "..." : t("approve")}
                  </button>
                  <button
                    onClick={() => handleAction(p.id, "reject")}
                    disabled={actionLoading === p.id}
                    className="px-4 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {t("reject")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
