"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LogoutButton } from "@/features/auth/components/logout-button";
import type {
  AdminDashboardResponseDto,
  AdminDashboardUserRowDto,
  AdminErrorDto,
} from "@/types/admin";

const DAY_OPTIONS = [7, 30, 90];
const PLAN_OPTIONS = ["basic", "pro", "enterprise"];

// SVGs
const UsersIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const BanknotesIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ServerIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

const BellIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const PLAN_COLORS: Record<string, string> = {
  pro: "border-purple-500/30 text-purple-400 bg-purple-500/10",
  basic: "border-slate-500/30 text-slate-400 bg-slate-500/10",
  enterprise: "border-blue-500/30 text-blue-400 bg-blue-500/10",
};

const KIND_COLORS: Record<string, string> = {
  image: "#8b5cf6", // Purple
  code: "#14b8a6", // Teal
  video: "#f59e0b", // Orange
  audio: "#ec4899", // Pink
  conversation: "#6366f1", // Indigo
  unknown: "#94a3b8",
};

const CHART_COLORS = [
  "#1e3a8a", // Dark blue
  "#2563eb", // Blue
  "#3b82f6", // Light blue
  "#60a5fa", // Lighter blue
  "#34d399", // Emerald
  "#10b981", // Green
];

async function parseAdminErrorResponse(response: Response): Promise<AdminErrorDto> {
  try {
    return (await response.json()) as AdminErrorDto;
  } catch {
    return {
      error: `Request failed with status ${response.status}.`,
    };
  }
}

function getStatusClasses(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "active") {
    return "text-emerald-400 font-medium";
  }
  if (normalized === "suspended" || normalized === "inactive" || normalized === "disabled") {
    return "text-rose-400 font-medium";
  }
  if (normalized === "pending") {
    return "text-amber-400 font-medium";
  }
  return "text-slate-400 font-medium";
}

function MetricCard({ 
  label, 
  value, 
  detail, 
  icon, 
  iconBg, 
  detailColor = "text-slate-500" 
}: { 
  label: string; 
  value: string; 
  detail: React.ReactNode; 
  icon: React.ReactNode; 
  iconBg: string; 
  detailColor?: string; 
}) {
  return (
    <article className="rounded-xl border border-[#2d313a] bg-[#1c212c] p-5">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-100">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${iconBg}`}>
          {icon}
        </div>
      </div>
      <p className={`mt-4 text-xs ${detailColor}`}>{detail}</p>
    </article>
  );
}

export function AdminDashboardPanel() {
  const [days, setDays] = useState<number>(30);
  const [payload, setPayload] = useState<AdminDashboardResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const recentUsers = payload?.recentUsers ?? [];

  const generationRows = useMemo(() => {
    const source = payload?.generationByKind ?? {};
    return Object.entries(source).sort((left, right) => right[1] - left[1]);
  }, [payload]);

  const tokenRows = useMemo(() => {
    const source = payload?.tokensByKind ?? {};
    return Object.entries(source).sort((left, right) => right[1] - left[1]);
  }, [payload]);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/admin/dashboard?days=${days}&generationKind=all`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const errorPayload = await parseAdminErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not load admin dashboard.");
        return;
      }

      const result = (await response.json()) as AdminDashboardResponseDto;
      setPayload(result);
    } catch {
      setErrorMessage("Unable to reach the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function updateUserStatus(user: AdminDashboardUserRowDto, nextStatus: "active" | "suspended") {
    setIsUpdating(`status:${user.id}`);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountStatus: nextStatus }),
      });

      if (!response.ok) {
        const errorPayload = await parseAdminErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not update account status.");
        return;
      }

      await loadDashboard();
    } catch {
      setErrorMessage("Unable to reach the server. Please try again.");
    } finally {
      setIsUpdating(null);
    }
  }

  async function updateUserPlan(user: AdminDashboardUserRowDto, nextPlan: string) {
    setIsUpdating(`plan:${user.id}`);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey: nextPlan }),
      });

      if (!response.ok) {
        const errorPayload = await parseAdminErrorResponse(response);
        setErrorMessage(errorPayload.error || "Could not update plan.");
        return;
      }

      await loadDashboard();
    } catch {
      setErrorMessage("Unable to reach the server. Please try again.");
    } finally {
      setIsUpdating(null);
    }
  }

  const dataChartBars = Array(6).fill(0).map((_, i) => {
    if (i < tokenRows.length) return tokenRows[i];
    return [`empty-${i}`, 0] as [string, number];
  });
  
  const maxTokens = Math.max(...dataChartBars.map(r => r[1]), 1);

  return (
    <main className="w-full min-h-screen bg-[#111318] p-6 lg:p-8 space-y-6">
      <header className="flex justify-between items-center mb-8 border-b border-[#2d313a] pb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-100 hidden sm:block">Admin Dashboard</h1>
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-md border border-[#2d313a] bg-[#1c212c] px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-slate-200 hover:bg-[#242938] transition-colors"
            >
              Back to dashboard
            </Link>
            <LogoutButton variant="dark" />
          </div>
          <div className="relative cursor-pointer hover:opacity-80 transition-opacity ml-2">
            <BellIcon className="w-5 h-5 text-slate-400" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#111318]" />
          </div>
        </div>
      </header>

      {errorMessage && (
        <p className="rounded-md border border-rose-700/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">
          {errorMessage}
        </p>
      )}

      {/* Metrics Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCard
          label="Active Users"
          value={String(payload?.stats.activeUsers ?? 0)}
          detail={
            <>
              <span className="text-emerald-400">Activity logged</span> <span className="text-slate-500">recently</span>
            </>
          }
          icon={<UsersIcon className="w-5 h-5 text-blue-500" />}
          iconBg="bg-blue-500/20"
        />
        <MetricCard
          label="Total Generations"
          value={String(payload?.stats.generationCount ?? 0)}
          detail={
            <>
              <span className="text-emerald-400">Within last</span> <span className="text-slate-500">{days} days</span>
            </>
          }
          icon={<SparklesIcon className="w-5 h-5 text-purple-500" />}
          iconBg="bg-purple-500/20"
        />
        <MetricCard
          label="Total Tokens"
          value={String(payload?.stats.tokenCount ?? 0)}
          detail={
            <>
              <span className="text-emerald-400">Within last</span> <span className="text-slate-500">{days} days</span>
            </>
          }
          icon={<BanknotesIcon className="w-5 h-5 text-emerald-500" />}
          iconBg="bg-emerald-500/20"
        />
        <MetricCard
          label="Suspended Users"
          value={String(payload?.stats.suspendedUsers ?? 0)}
          detail={
            <>
              <span className="text-emerald-400">Currently</span> <span className="text-slate-500">restricted</span>
            </>
          }
          icon={<ServerIcon className="w-5 h-5 text-orange-500" />}
          iconBg="bg-orange-500/20"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr] mb-6">
        <article className="rounded-xl border border-[#2d313a] bg-[#1c212c] p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-semibold text-slate-100">API Usage Overview</h3>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-[#242938] border border-[#2d313a] rounded-md px-3 py-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer hover:bg-[#2c3245] transition-colors"
            >
              {DAY_OPTIONS.map((val) => (
                <option key={val} value={val}>Last {val} days</option>
              ))}
            </select>
          </div>

          <div className="flex items-end justify-between gap-0 h-48 mt-4 rounded-b-md overflow-hidden">
            {isLoading ? (
               <p className="text-sm text-slate-500 mt-auto mb-auto w-full text-center">Loading chart...</p>
            ) : dataChartBars.map(([kind, count], idx) => {
              const heightPct = kind.startsWith('empty') ? 5 : Math.max((count / maxTokens) * 100, 10);
              const color = CHART_COLORS[idx % CHART_COLORS.length];
              return (
                <div
                  key={`${kind}-${idx}`}
                  className="flex-1 opacity-90 hover:opacity-100 transition-opacity"
                  style={{ height: heightPct > 0 ? `${heightPct}%` : '5%', backgroundColor: color }}
                  title={`${kind}: ${count}`}
                />
              );
            })}
          </div>
        </article>

        <article className="rounded-xl border border-[#2d313a] bg-[#1c212c] p-6 flex flex-col">
          <h3 className="text-base font-semibold text-slate-100 mb-6">Generation Types</h3>
          
          <div className="flex-1 flex flex-col justify-center">
            {isLoading ? (
               <p className="text-sm text-slate-500 text-center">Loading...</p>
            ) : generationRows.length === 0 ? (
               <p className="text-sm text-slate-500 text-center">No data</p>
            ) : (
              <div className="space-y-5">
                {generationRows.map(([kind, count]) => {
                  const total = generationRows.reduce((sum, r) => sum + r[1], 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const friendlyName = kind.toLowerCase().includes("generation") 
                     ? kind 
                     : `${kind} Generation`;
                     
                  return (
                    <div key={kind} className="space-y-2">
                      <div className="flex justify-between text-xs font-medium text-slate-300">
                        <span className="capitalize">{friendlyName}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#2a3142] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: KIND_COLORS[kind] || KIND_COLORS.unknown,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </article>
      </div>

      {/* Table Row */}
      <article className="overflow-hidden rounded-xl border border-[#2d313a] bg-[#1c212c]">
        <header className="flex justify-between items-center px-6 py-4">
          <h3 className="text-base font-semibold text-slate-100">Recent Users</h3>
          <button className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">View All</button>
        </header>

        {isLoading ? (
          <p className="px-6 py-5 text-sm text-slate-500">Loading users...</p>
        ) : recentUsers.length === 0 ? (
          <p className="px-6 py-5 text-sm text-slate-500">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-[#1c212c] border-b border-[#2d313a] text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Plan</th>
                  <th className="px-6 py-3">Usage</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d313a] text-sm text-slate-300 bg-[#1c212c]">
                {recentUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#2a3142] flex items-center justify-center text-slate-300 font-bold text-xs uppercase shrink-0">
                          {(user.name ?? "U")[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-200 text-xs">{user.name ?? "Unnamed user"}</p>
                          <p className="text-[11px] text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <select
                        value={user.planKey}
                        onChange={(e) => void updateUserPlan(user, e.target.value)}
                        disabled={isUpdating === `plan:${user.id}`}
                        className={`appearance-none rounded-full border px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider cursor-pointer focus:outline-none disabled:opacity-60 text-center ${
                          PLAN_COLORS[user.planKey?.toLowerCase()] || PLAN_COLORS.basic
                        }`}
                      >
                        {PLAN_OPTIONS.map((planKey) => (
                          <option key={planKey} value={planKey} className="bg-[#1c212c] text-slate-200">
                            {planKey}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-400">
                      {user.generationCount.toLocaleString()} req / mo
                    </td>
                    <td className="px-6 py-3 text-xs">
                      <span className={getStatusClasses(user.accountStatus)}>
                        {user.accountStatus[0].toUpperCase() + user.accountStatus.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-3 text-[11px] font-medium">
                        <button className="text-blue-400 hover:text-blue-300 transition-colors">
                          Edit
                        </button>
                        {user.accountStatus.toLowerCase() === "active" ? (
                          <button
                            type="button"
                            onClick={() => updateUserStatus(user, "suspended")}
                            disabled={isUpdating === `status:${user.id}`}
                            className="text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-50"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateUserStatus(user, "active")}
                            disabled={isUpdating === `status:${user.id}`}
                            className="text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </main>
  );
}
