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
  today: { calls: number; tokens: number; inputTokens: number; outputTokens: number; cost: number; uniqueUsers: number };
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

interface WebVitalData {
  metrics: Array<{
    metric: string;
    count: number;
    p50: number;
    p75: number;
    p95: number;
    ratingBreakdown: { good: number; needsImprovement: number; poor: number };
    daily: Array<{ date: string; p75: number; count: number }>;
  }>;
  totalRecords: number;
  since: string;
}

interface RateLimitData {
  config: Record<string, { windowMs: number; maxRequests: number }>;
  tiers: Array<{ name: string; maxRequests: number; windowMs: number; windowSeconds: number; requestsPerSecond: string }>;
  recentBlocked: Array<{ id: string; route: string; ip: string | null; createdAt: string; provider: string }>;
  backend: string;
}

interface ErrorData {
  totalErrors: number;
  recentErrors: Array<{ id: string; provider: string; model: string; route: string; ip: string | null; createdAt: string; userId: string | null }>;
  auditErrors: Array<{ id: string; action: string; resource: string | null; details: string | null; ip: string | null; createdAt: string }>;
  daily: Array<{ date: string; count: number }>;
  byProvider: Record<string, number>;
  sentryEnabled: boolean;
}

// ── Stats Card macro ──
const colorStyles: Record<string, { border: string; text: string }> = {
  blue:    { border: "border-blue-100",    text: "text-blue-600" },
  green:   { border: "border-green-100",   text: "text-green-600" },
  purple:  { border: "border-purple-100",  text: "text-purple-600" },
  red:     { border: "border-red-100",     text: "text-red-600" },
  gray:    { border: "border-gray-100",    text: "text-gray-600" },
  amber:   { border: "border-amber-100",   text: "text-amber-600" },
};

function StatCard({ label, value, sub, color = "blue" }: { label: string; value: string; sub?: string; color?: string }) {
  const cs = colorStyles[color] || colorStyles.blue;
  return (
    <div className={`bg-white rounded-lg border ${cs.border} p-4`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${cs.text}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const ratingColor = (rating: string) => {
  if (rating === "good") return "text-green-600";
  if (rating === "needs-improvement") return "text-amber-600";
  return "text-red-600";
};

const ratingBg = (rating: string) => {
  if (rating === "good") return "bg-green-500";
  if (rating === "needs-improvement") return "bg-amber-500";
  return "bg-red-500";
};

export default function AdminClient({
  manualPaymentEnabled = false,
}: {
  manualPaymentEnabled?: boolean;
}) {
  const t = useTranslations("admin");
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [webVitals, setWebVitals] = useState<WebVitalData | null>(null);
  const [rateLimitData, setRateLimitData] = useState<RateLimitData | null>(null);
  const [errorData, setErrorData] = useState<ErrorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"stats" | "payments" | "calls" | "performance" | "rateLimits" | "errors">("stats");

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pending");
      if (res.status === 403) { setAuthorized(false); setError(t("forbidden")); setLoading(false); return; }
      setAuthorized(true);
      const data = await res.json();
      if (data.payments) setPayments(data.payments);
    } catch { setError(t("loadError")); } finally { setLoading(false); }
  }, [t]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 403) { setAuthorized(false); return; }
      if (res.ok) { const data = await res.json(); setStats(data); }
    } catch { /* non-critical */ }
  }, []);

  const fetchWebVitals = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/web-vitals");
      if (res.ok) { const data = await res.json(); setWebVitals(data); }
    } catch { /* non-critical */ }
  }, []);

  const fetchRateLimits = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/rate-limits");
      if (res.ok) { const data = await res.json(); setRateLimitData(data); }
    } catch { /* non-critical */ }
  }, []);

  const fetchErrors = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/errors");
      if (res.ok) { const data = await res.json(); setErrorData(data); }
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isSignedIn) { fetchPayments(); fetchStats(); }
    else if (isLoaded) { router.push("/sign-in"); }
  }, [isSignedIn, isLoaded, fetchPayments, fetchStats, router]);

  useEffect(() => {
    if (authorized === false) router.push("/dashboard");
  }, [authorized, router]);

  // Lazy-load tab data
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tab === "performance" && !webVitals) fetchWebVitals();
    if (tab === "rateLimits" && !rateLimitData) fetchRateLimits();
    if (tab === "errors" && !errorData) fetchErrors();
  }, [tab, webVitals, rateLimitData, errorData, fetchWebVitals, fetchRateLimits, fetchErrors]);

  const handleAction = async (paymentId: string, action: "approve" | "reject") => {
    setActionLoading(paymentId);
    try {
      const res = await fetch(`/api/admin/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId }) });
      if (res.ok) setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    } catch { /* silent */ } finally { setActionLoading(null); }
  };

  const formatAmountCents = (cents: number) => `¥${(cents / 100).toFixed(0)}`;
  const formatDate = (iso: string) => new Date(iso).toLocaleString("zh-CN");
  const planLabel = (plan: string) => plan === "pro_monthly" ? t("planMonthly") : t("planYearly");
  const channelLabel = (channel: string) => channel === "alipay" ? t("alipay") : channel === "wechat" ? t("wechat") : channel;
  const formatCost = (usd: number) => `$${usd.toFixed(4)}`;
  const formatTokens = (n: number) => n >= 1000 ? `${+(n / 1000).toFixed(1)}K` : String(n);
  const formatMs = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms.toFixed(0)}ms`;

  if (!isLoaded || loading) {
    return (<div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>);
  }
  if (!isSignedIn) return null;

  const tabs: Array<{ key: typeof tab; label: string }> = [
    { key: "stats", label: t("tabStats") },
    { key: "payments", label: t("tabPayments") },
    { key: "calls", label: t("tabCalls") },
    { key: "performance", label: "Performance" },
    { key: "rateLimits", label: "Rate Limits" },
    { key: "errors", label: "Errors" },
  ];

  return (
    <main className="min-h-[80vh] py-8 px-4 max-w-5xl mx-auto" id="main-content">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-500 mt-1">{t("subtitle")}</p>
        </div>
        <button onClick={() => { fetchStats(); fetchPayments(); setWebVitals(null); setRateLimitData(null); setErrorData(null); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">{t("refresh")}</button>
      </div>

      {error && (<div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>)}

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
        {tabs.map((tabItem) => (
          <button key={tabItem.key} onClick={() => setTab(tabItem.key)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === tabItem.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{tabItem.label}</button>
        ))}
      </div>

      {/* ────── STATS TAB ────── */}
      {tab === "stats" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label={t("todayCalls")} value={String(stats.today.calls)} sub={`${t("yesterday")}: ${stats.yesterday.calls}`} color="blue" />
            <StatCard label={t("todayTokens")} value={formatTokens(stats.today.tokens)} sub={t("inputOutput", { input: formatTokens(stats.today.inputTokens ?? stats.today.tokens), output: formatTokens(stats.today.outputTokens ?? 0) })} color="purple" />
            <StatCard label={t("todayCost")} value={formatCost(stats.today.cost)} sub={`${t("yesterday")}: ${formatCost(stats.yesterday.cost)}`} color="red" />
            <StatCard label={t("todayUsers")} value={String(stats.today.uniqueUsers)} sub={`${t("totalUsers")}: ${stats.users.total} (Pro: ${stats.users.pro})`} color="green" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">{t("weekChart")}</h3>
            <div className="h-48 flex items-end gap-2">
              {stats.week.map((day) => {
                const maxCalls = Math.max(...stats.week.map((d) => d.calls), 1);
                const height = Math.max((day.calls / maxCalls) * 100, 3);
                return (<div key={day.date} className="flex-1 flex flex-col items-center gap-1 min-w-0"><span className="text-xs font-medium text-gray-700">{day.calls}</span><div className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer" style={{ height: `${height}%` }} title={`${day.date}: ${day.calls} calls, ${formatTokens(day.tokens)} tokens, ${formatCost(day.cost)}`} /><span className="text-[10px] text-gray-400 truncate w-full text-center">{day.date.slice(5)}</span></div>);
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard label={t("allTimeCalls")} value={String(stats.totals.calls)} color="blue" />
            <StatCard label={t("allTimeTokens")} value={formatTokens(stats.totals.tokens)} color="purple" />
            <StatCard label={t("allTimeCost")} value={formatCost(stats.totals.cost)} color="red" />
          </div>
          {stats.providerBreakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{t("providerBreakdown")}</h3>
              <div className="space-y-2">{stats.providerBreakdown.map((p) => (<div key={p.provider} className="flex items-center justify-between text-sm"><span className="text-gray-600 font-medium">{p.provider}</span><span className="text-gray-400">{p.calls} calls · {formatTokens(p.tokens)} · {formatCost(p.cost)}</span></div>))}</div>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><StatCard label={t("totalDocs")} value={String(stats.documents)} color="gray" /></div>
        </div>
      )}

      {/* ────── PAYMENTS TAB ────── */}
      {tab === "payments" && (
        <>
          {!manualPaymentEnabled && (<div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-sm"><span>{t("manualPaymentDisabled")}</span></div>)}
          {payments.length === 0 ? (
            <div className="text-center py-16 text-gray-500"><p className="text-lg">{t("empty")}</p></div>
          ) : (
            <div className="space-y-4">{payments.map((p) => (<div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"><div className="flex items-start justify-between gap-4"><div className="flex-1 min-w-0"><div className="flex items-center gap-3 mb-2"><span className="text-sm font-medium text-gray-900">{p.user.email}</span><span className={`px-2 py-0.5 text-xs rounded-full ${p.user.subscriptionStatus === "pro" ? "bg-blue-100 text-blue-700" : p.user.subscriptionStatus === "pro_trial" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>{p.user.subscriptionStatus === "pro" ? "Pro" : p.user.subscriptionStatus === "pro_trial" ? "Trial" : "Free"}</span></div><div className="flex flex-wrap items-center gap-2 text-sm text-gray-500"><span className="font-semibold text-gray-700">{formatAmountCents(p.amount)}</span><span>·</span><span>{planLabel(p.plan)}</span><span>·</span><span>{channelLabel(p.channel)}</span>{p.txnRef && (<><span>·</span><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{t("txnRef")}: {p.txnRef}</span></>)}</div><p className="text-xs text-gray-400 mt-1">{formatDate(p.createdAt)}</p></div><div className="flex gap-2 shrink-0"><button onClick={() => handleAction(p.id, "approve")} disabled={actionLoading === p.id} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">{actionLoading === p.id ? "..." : t("approve")}</button><button onClick={() => handleAction(p.id, "reject")} disabled={actionLoading === p.id} className="px-4 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">{t("reject")}</button></div></div></div>))}</div>
          )}
        </>
      )}

      {/* ────── CALLS TAB ────── */}
      {tab === "calls" && stats && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50"><h3 className="text-sm font-semibold text-gray-700">{t("recentCalls")}</h3></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100"><th className="px-5 py-2">{t("time")}</th><th className="px-5 py-2">{t("provider")}</th><th className="px-5 py-2">{t("type")}</th><th className="px-5 py-2">{t("tokens")}</th><th className="px-5 py-2">{t("cost")}</th></tr></thead><tbody>{stats.recentCalls.map((c) => (<tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50"><td className="px-5 py-2 text-gray-500 text-xs">{new Date(c.createdAt).toLocaleString("zh-CN")}</td><td className="px-5 py-2 text-gray-700">{c.provider}</td><td className="px-5 py-2"><span className={`px-1.5 py-0.5 text-xs rounded ${c.userType === "pro" ? "bg-blue-100 text-blue-700" : c.userType === "trial" ? "bg-purple-100 text-purple-700" : c.userType === "guest" ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"}`}>{c.userType}</span><span className="text-gray-400 ml-1">· {c.route}</span></td><td className="px-5 py-2 text-gray-600">{formatTokens(c.totalTokens)}</td><td className="px-5 py-2 text-red-500 text-xs">${c.costUSD.toFixed(4)}</td></tr>))}</tbody></table></div>
        </div>
      )}

      {/* ────── PERFORMANCE TAB ────── */}
      {tab === "performance" && (
        <div className="space-y-6">
          {!webVitals ? (
            <div className="text-center py-16 text-gray-500"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div><p>Loading performance data...</p></div>
          ) : webVitals.totalRecords === 0 ? (
            <div className="text-center py-16 text-gray-500"><p className="text-lg">No Web Vitals data yet. Data will appear after users visit the site.</p></div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Total Records" value={String(webVitals.totalRecords)} sub={`Since: ${new Date(webVitals.since).toLocaleDateString()}`} color="blue" />
                {webVitals.metrics.filter(m => m.count > 0).slice(0, 3).map((m) => (
                  <StatCard key={m.metric} label={m.metric} value={formatMs(m.p75)} sub={`P95: ${formatMs(m.p95)}`} color={m.ratingBreakdown.poor > m.ratingBreakdown.good ? "red" : m.ratingBreakdown.needsImprovement > 0 ? "amber" : "green"} />
                ))}
              </div>
              {webVitals.metrics.filter(m => m.count > 0).map((m) => (
                <div key={m.metric} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700">{m.metric} <span className="text-gray-400 font-normal">({m.count} samples)</span></h3>
                    <div className="flex gap-2 text-xs">
                      <span className="px-2 py-1 bg-green-50 text-green-700 rounded">Good: {m.ratingBreakdown.good}</span>
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded">NI: {m.ratingBreakdown.needsImprovement}</span>
                      <span className="px-2 py-1 bg-red-50 text-red-700 rounded">Poor: {m.ratingBreakdown.poor}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-2 bg-gray-50 rounded"><p className="text-xs text-gray-500">P50 (Median)</p><p className="text-lg font-bold text-gray-700">{formatMs(m.p50)}</p></div>
                    <div className="text-center p-2 bg-gray-50 rounded"><p className="text-xs text-gray-500">P75</p><p className="text-lg font-bold text-gray-700">{formatMs(m.p75)}</p></div>
                    <div className="text-center p-2 bg-gray-50 rounded"><p className="text-xs text-gray-500">P95</p><p className="text-lg font-bold text-gray-700">{formatMs(m.p95)}</p></div>
                  </div>
                  {/* Daily trend bar chart */}
                  <div className="h-32 flex items-end gap-1">
                    {m.daily.map((d) => {
                      const maxP75 = Math.max(...m.daily.map((x) => x.p75), 1);
                      const height = Math.max((d.p75 / maxP75) * 100, 2);
                      return (<div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0"><div className={`w-full ${ratingBg(d.p75 > m.p95 ? "poor" : d.p75 > m.p50 ? "needs-improvement" : "good")} rounded-t opacity-70 hover:opacity-100 transition-opacity cursor-pointer`} style={{ height: `${height}%` }} title={`${d.date}: P75=${formatMs(d.p75)}, ${d.count} samples`} /><span className="text-[9px] text-gray-400">{d.date.slice(5)}</span></div>);
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ────── RATE LIMITS TAB ────── */}
      {tab === "rateLimits" && (
        <div className="space-y-6">
          {!rateLimitData ? (
            <div className="text-center py-16 text-gray-500"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div><p>Loading rate limit data...</p></div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Backend" value={rateLimitData.backend === "redis" ? "Redis" : "In-Memory"} sub={rateLimitData.backend === "redis" ? "Production (shared)" : "Dev/Fallback"} color={rateLimitData.backend === "redis" ? "green" : "amber"} />
                <StatCard label="Total Tiers" value={String(rateLimitData.tiers.length)} color="blue" />
                <StatCard label="Recent Blocked" value={String(rateLimitData.recentBlocked.length)} color="red" />
                <StatCard label="Strictest Tier" value={rateLimitData.tiers.reduce((min, t) => t.maxRequests < min.maxRequests ? t : min).name} sub={`${rateLimitData.tiers.reduce((min, t) => t.maxRequests < min.maxRequests ? t : min).maxRequests} req/window`} color="purple" />
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Rate Limit Tiers</h3>
                <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100"><th className="px-4 py-2">Tier</th><th className="px-4 py-2">Max Requests</th><th className="px-4 py-2">Window</th><th className="px-4 py-2">Req/Sec</th></tr></thead><tbody>{rateLimitData.tiers.map((tier) => (<tr key={tier.name} className="border-b border-gray-50"><td className="px-4 py-2 font-medium text-gray-700">{tier.name}</td><td className="px-4 py-2 text-gray-600">{tier.maxRequests}</td><td className="px-4 py-2 text-gray-600">{tier.windowSeconds}s</td><td className="px-4 py-2 text-gray-500 text-xs">{tier.requestsPerSecond}</td></tr>))}</tbody></table></div>
              </div>
              {rateLimitData.recentBlocked.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Blocked/Error Requests</h3>
                  <div className="space-y-2">{rateLimitData.recentBlocked.slice(0, 10).map((r) => (<div key={r.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2"><div><span className="text-gray-700 font-medium">{r.provider}</span><span className="text-gray-400 ml-2">· {r.route}</span></div><div className="text-xs text-gray-500">{r.ip || "unknown"} · {formatDate(r.createdAt)}</div></div>))}</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ────── ERRORS TAB ────── */}
      {tab === "errors" && (
        <div className="space-y-6">
          {!errorData ? (
            <div className="text-center py-16 text-gray-500"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div><p>Loading error data...</p></div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Total Errors (7d)" value={String(errorData.totalErrors)} color="red" />
                <StatCard label="Sentry" value={errorData.sentryEnabled ? "Enabled" : "Disabled"} color={errorData.sentryEnabled ? "green" : "gray"} />
                <StatCard label="Audit Errors" value={String(errorData.auditErrors.length)} color="amber" />
                <StatCard label="Avg/Day" value={(errorData.totalErrors / 7).toFixed(1)} color="purple" />
              </div>
              {/* Daily error trend */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Daily Error Trend (7 days)</h3>
                <div className="h-32 flex items-end gap-2">{errorData.daily.map((d) => {
                  const maxCount = Math.max(...errorData.daily.map((x) => x.count), 1);
                  const height = Math.max((d.count / maxCount) * 100, 3);
                  return (<div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0"><span className="text-xs font-medium text-gray-700">{d.count}</span><div className="w-full bg-red-400 rounded-t hover:bg-red-500 transition-colors" style={{ height: `${height}%` }} /><span className="text-[9px] text-gray-400">{d.date.slice(5)}</span></div>);
                })}</div>
              </div>
              {/* Errors by provider */}
              {Object.keys(errorData.byProvider).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Errors by Provider</h3>
                  <div className="space-y-2">{Object.entries(errorData.byProvider).map(([provider, count]) => (<div key={provider} className="flex items-center justify-between text-sm"><span className="text-gray-600 font-medium">{provider}</span><span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs">{count} errors</span></div>))}</div>
                </div>
              )}
              {/* Recent errors table */}
              {errorData.recentErrors.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 bg-gray-50"><h3 className="text-sm font-semibold text-gray-700">Recent Errors</h3></div>
                  <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100"><th className="px-4 py-2">Time</th><th className="px-4 py-2">Provider</th><th className="px-4 py-2">Route</th><th className="px-4 py-2">IP</th></tr></thead><tbody>{errorData.recentErrors.slice(0, 15).map((e) => (<tr key={e.id} className="border-b border-gray-50"><td className="px-4 py-2 text-xs text-gray-500">{formatDate(e.createdAt)}</td><td className="px-4 py-2 text-gray-700">{e.provider}</td><td className="px-4 py-2 text-gray-500">{e.route}</td><td className="px-4 py-2 text-gray-400 text-xs">{e.ip || "—"}</td></tr>))}</tbody></table></div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}
