"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";

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

interface AdminStats {
  today: { calls: number; tokens: number; cost: number; uniqueUsers: number };
  yesterday: { calls: number; tokens: number; cost: number };
  week: Array<{ date: string; calls: number; tokens: number; cost: number }>;
  totals: { calls: number; tokens: number; cost: number; firstRecorded: string | null };
  users: { total: number; pro: number; free: number };
  documents: number;
  recentCalls: Array<{
    id: string;
    provider: string;
    model: string;
    totalTokens: number;
    costUSD: number;
    userType: string;
    route: string;
    createdAt: string;
  }>;
  providerBreakdown: Array<{ provider: string; calls: number; tokens: number; cost: number }>;
}

export default function AdminPage() {
  const t = useTranslations("admin");
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"stats" | "payments" | "calls">("stats");

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pending");
      if (res.status === 403) {
        setAuthorized(false);
        setError(t("forbidden"));
        setLoading(false);
        return;
      }
      setAuthorized(true);
      const data = await res.json();
      if (data.payments) setPayments(data.payments);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 403) {
        setAuthorized(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // stats load failure is non-critical
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      fetchPayments();
      fetchStats();
    } else if (isLoaded) {
      router.push("/sign-in");
    }
  }, [isSignedIn, isLoaded, fetchPayments, fetchStats, router]);

  // Redirect non-admin users after verification
  useEffect(() => {
    if (authorized === false) {
      router.push("/dashboard");
    }
  }, [authorized, router]);

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

  const formatAmountCents = (cents: number) => `¥${(cents / 100).toFixed(0)}`;
  const formatDate = (iso: string) => new Date(iso).toLocaleString("zh-CN");
  const planLabel = (plan: string) =>
    plan === "pro_monthly" ? t("planMonthly") : t("planYearly");
  const channelLabel = (channel: string) =>
    channel === "alipay" ? t("alipay") : channel === "wechat" ? t("wechat") : channel;
  const formatCost = (usd: number) => `$${usd.toFixed(4)}`;
  const formatTokens = (n: number) => n >= 1000 ? `${+(n / 1000).toFixed(1)}K` : String(n);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSignedIn) return null;

  // ── Stats Card macro ──
  const StatCard = ({ label, value, sub, color = "blue" }: { label: string; value: string; sub?: string; color?: string }) => (
    <div className={`bg-white rounded-lg border border-${color}-100 p-4`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );

  return (
    <main className="min-h-[80vh] py-8 px-4 max-w-5xl mx-auto" id="main-content">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-500 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { fetchStats(); fetchPayments(); }}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t("refresh")}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {(["stats", "payments", "calls"] as const).map((tKey) => (
          <button
            key={tKey}
            onClick={() => setTab(tKey)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === tKey ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {tKey === "stats" ? t("tabStats") : tKey === "payments" ? t("tabPayments") : t("tabCalls")}
          </button>
        ))}
      </div>

      {/* ──────────── STATS TAB ──────────── */}
      {tab === "stats" && stats && (
        <div className="space-y-6">
          {/* Today KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label={t("todayCalls")}
              value={String(stats.today.calls)}
              sub={`${t("yesterday")}: ${stats.yesterday.calls}`}
              color="blue"
            />
            <StatCard
              label={t("todayTokens")}
              value={formatTokens(stats.today.tokens)}
              sub={t("inputOutput", { input: formatTokens(stats.today.inputTokens ?? stats.today.tokens), output: formatTokens(stats.today.outputTokens ?? 0) })}
              color="purple"
            />
            <StatCard
              label={t("todayCost")}
              value={formatCost(stats.today.cost)}
              sub={`${t("yesterday")}: ${formatCost(stats.yesterday.cost)}`}
              color="red"
            />
            <StatCard
              label={t("todayUsers")}
              value={String(stats.today.uniqueUsers)}
              sub={`${t("totalUsers")}: ${stats.users.total} (Pro: ${stats.users.pro})`}
              color="green"
            />
          </div>

          {/* 7-Day Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">{t("weekChart")}</h3>
            <div className="h-48 flex items-end gap-2">
              {stats.week.map((day) => {
                const maxCalls = Math.max(...stats.week.map((d) => d.calls), 1);
                const height = Math.max((day.calls / maxCalls) * 100, 3);
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <span className="text-xs font-medium text-gray-700">{day.calls}</span>
                    <div
                      className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                      style={{ height: `${height}%` }}
                      title={`${day.date}: ${day.calls} calls, ${formatTokens(day.tokens)} tokens, ${formatCost(day.cost)}`}
                    />
                    <span className="text-[10px] text-gray-400 truncate w-full text-center">
                      {day.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard label={t("allTimeCalls")} value={String(stats.totals.calls)} color="blue" />
            <StatCard label={t("allTimeTokens")} value={formatTokens(stats.totals.tokens)} color="purple" />
            <StatCard label={t("allTimeCost")} value={formatCost(stats.totals.cost)} color="red" />
          </div>

          {/* Provider breakdown */}
          {stats.providerBreakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{t("providerBreakdown")}</h3>
              <div className="space-y-2">
                {stats.providerBreakdown.map((p) => (
                  <div key={p.provider} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">{p.provider}</span>
                    <span className="text-gray-400">{p.calls} calls · {formatTokens(p.tokens)} · {formatCost(p.cost)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User & Doc totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-500">
            <StatCard label={t("totalDocs")} value={String(stats.documents)} color="gray" />
          </div>
        </div>
      )}

      {/* ──────────── PAYMENTS TAB ──────────── */}
      {tab === "payments" && (
        <>
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
                            : p.user.subscriptionStatus === "pro_trial"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {p.user.subscriptionStatus === "pro" ? "Pro" : p.user.subscriptionStatus === "pro_trial" ? "Trial" : "Free"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                        <span className="font-semibold text-gray-700">{formatAmountCents(p.amount)}</span>
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
        </>
      )}

      {/* ──────────── CALLS TAB ──────────── */}
      {tab === "calls" && stats && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">{t("recentCalls")}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-2">{t("time")}</th>
                  <th className="px-5 py-2">{t("provider")}</th>
                  <th className="px-5 py-2">{t("type")}</th>
                  <th className="px-5 py-2">{t("tokens")}</th>
                  <th className="px-5 py-2">{t("cost")}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentCalls.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-2 text-gray-500 text-xs">{new Date(c.createdAt).toLocaleString("zh-CN")}</td>
                    <td className="px-5 py-2 text-gray-700">{c.provider}</td>
                    <td className="px-5 py-2">
                      <span className={`px-1.5 py-0.5 text-xs rounded ${
                        c.userType === "pro" ? "bg-blue-100 text-blue-700" :
                        c.userType === "trial" ? "bg-purple-100 text-purple-700" :
                        c.userType === "guest" ? "bg-gray-100 text-gray-600" :
                        "bg-green-100 text-green-700"
                      }`}>{c.userType}</span>
                      <span className="text-gray-400 ml-1">· {c.route}</span>
                    </td>
                    <td className="px-5 py-2 text-gray-600">{formatTokens(c.totalTokens)}</td>
                    <td className="px-5 py-2 text-red-500 text-xs">${c.costUSD.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
