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
const GENERATION_KIND_OPTIONS = ["all", "text", "code", "image", "video", "conversation"];
const PLAN_OPTIONS = ["basic", "pro", "enterprise"];

const KIND_COLORS: Record<string, string> = {
  text: "#14b8a6",
  code: "#3b82f6",
  image: "#ec4899",
  video: "#f59e0b",
  conversation: "#8b5cf6",
  unknown: "#94a3b8",
};

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  accentClassName?: string;
};

type KindRowsProps = {
  title: string;
  rows: Array<[string, number]>;
  emptyLabel: string;
  valueSuffix?: string;
};

async function parseAdminErrorResponse(response: Response): Promise<AdminErrorDto> {
  try {
    return (await response.json()) as AdminErrorDto;
  } catch {
    return {
      error: `Request failed with status ${response.status}.`,
    };
  }
}

function formatDateTime(timestampMs: number | null): string {
  if (!timestampMs) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestampMs));
}

function formatKindLabel(kind: string): string {
  if (!kind) {
    return "Unknown";
  }

  return kind[0].toUpperCase() + kind.slice(1);
}

function getKindColor(kind: string): string {
  return KIND_COLORS[kind] ?? KIND_COLORS.unknown;
}

function getStatusClasses(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "active") {
    return "bg-emerald-500/20 text-emerald-300";
  }

  if (normalized === "suspended" || normalized === "inactive" || normalized === "disabled") {
    return "bg-rose-500/20 text-rose-300";
  }

  if (normalized === "pending") {
    return "bg-amber-500/20 text-amber-300";
  }

  return "bg-slate-500/20 text-slate-300";
}

function MetricCard({ label, value, detail, accentClassName }: MetricCardProps) {
  return (
    <article className="rounded-xl border border-[#2d313a] bg-[linear-gradient(135deg,#1c2130_0%,#141822_100%)] p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accentClassName ?? "text-slate-100"}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function KindRowsChart({ title, rows, emptyLabel, valueSuffix = "" }: KindRowsProps) {
  const total = rows.reduce((sum, [, count]) => sum + count, 0);
  const maxValue = rows.reduce((max, [, count]) => Math.max(max, count), 0);

  return (
    <article className="rounded-xl border border-[#2d313a] bg-[#171b25] p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{title}</h3>
        <span className="text-xs text-slate-400">Total: {total.toLocaleString()}{valueSuffix}</span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map(([kind, count]) => {
            const color = getKindColor(kind);
            const ratioByMax = maxValue > 0 ? (count / maxValue) * 100 : 0;
            const ratioByTotal = total > 0 ? (count / total) * 100 : 0;

            return (
              <li key={`${title}-${kind}`} className="rounded-lg border border-[#2d313a] bg-[#11141b] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    <span className="capitalize">{formatKindLabel(kind)}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-100">
                      {count.toLocaleString()}
                      {valueSuffix}
                    </p>
                    <p className="text-xs text-slate-400">{ratioByTotal.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#2a3142]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(ratioByMax, 4)}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

export function AdminDashboardPanel() {
  const [days, setDays] = useState<number>(30);
  const [generationKind, setGenerationKind] = useState<string>("all");
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
        `/api/admin/dashboard?days=${days}&generationKind=${generationKind}`,
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
  }, [days, generationKind]);

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

  return (
    <main className="min-h-screen bg-[#0f1115] px-5 py-5 text-slate-100 sm:px-8 sm:py-8 lg:px-16 lg:py-16">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-wide text-[#14b8a6]">Admin Panel</p>
            <h1 className="text-3xl font-bold tracking-tight">Aethermind Administration</h1>
            <p className="mt-1 text-sm text-slate-400">
              Monitor platform usage, manage users, and control plan entitlements.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-md border border-[#2d313a] px-4 py-2 text-sm font-medium text-slate-200 hover:bg-[#171b25]"
            >
              Back to dashboard
            </Link>
            <LogoutButton variant="dark" />
          </div>
        </header>

        <section className="rounded-xl border border-[#2d313a] bg-[#171b25] p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold">Filters</h2>
            <button
              type="button"
              onClick={() => {
                void loadDashboard();
              }}
              className="rounded-md border border-[#2d313a] px-3 py-2 text-sm text-slate-300 hover:bg-[#1f2430]"
            >
              Refresh
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-300">
              Time range
              <select
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
                className="mt-1 block w-full rounded-md border border-[#2d333b] bg-[#0f1115] px-3 py-2 text-sm text-slate-100 focus:border-[#14b8a6] focus:outline-none"
              >
                {DAY_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    Last {value} days
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-300">
              Generation type
              <select
                value={generationKind}
                onChange={(event) => setGenerationKind(event.target.value)}
                className="mt-1 block w-full rounded-md border border-[#2d333b] bg-[#0f1115] px-3 py-2 text-sm text-slate-100 focus:border-[#14b8a6] focus:outline-none"
              >
                {GENERATION_KIND_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value[0].toUpperCase() + value.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {errorMessage ? (
          <p className="rounded-md border border-rose-700/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">
            {errorMessage}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Total Users"
            value={String(payload?.stats.totalUsers ?? 0)}
            detail="Registered accounts"
          />
          <MetricCard
            label="Active Users"
            value={String(payload?.stats.activeUsers ?? 0)}
            detail="Currently active"
            accentClassName="text-emerald-300"
          />
          <MetricCard
            label="Suspended Users"
            value={String(payload?.stats.suspendedUsers ?? 0)}
            detail="Access restricted"
            accentClassName="text-rose-300"
          />
          <MetricCard
            label="Admin Accounts"
            value={String(payload?.stats.totalAdmins ?? 0)}
            detail="Admin-enabled users"
            accentClassName="text-cyan-300"
          />
          <MetricCard
            label="Generations"
            value={String(payload?.stats.generationCount ?? 0)}
            detail={`Within last ${days} days`}
            accentClassName="text-[#14b8a6]"
          />
          <MetricCard
            label="Tokens"
            value={String(payload?.stats.tokenCount ?? 0)}
            detail={`Within last ${days} days`}
            accentClassName="text-amber-300"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {isLoading ? (
            <article className="rounded-xl border border-[#2d313a] bg-[#171b25] p-6">
              <p className="text-sm text-slate-500">Loading generation graph...</p>
            </article>
          ) : (
            <KindRowsChart
              title="Generations by Type"
              rows={generationRows}
              emptyLabel="No generation activity in this window."
            />
          )}

          {isLoading ? (
            <article className="rounded-xl border border-[#2d313a] bg-[#171b25] p-6">
              <p className="text-sm text-slate-500">Loading token graph...</p>
            </article>
          ) : (
            <KindRowsChart
              title="Tokens by Type"
              rows={tokenRows}
              emptyLabel="No token activity in this window."
            />
          )}
        </div>

        <article className="overflow-hidden rounded-xl border border-[#2d313a] bg-[#171b25]">
          <header className="border-b border-[#2d313a] px-6 py-4">
            <h3 className="text-base font-semibold">Recent Users</h3>
            <p className="text-sm text-slate-400">Manage account status and plan assignments.</p>
          </header>

          {isLoading ? (
            <p className="px-6 py-5 text-sm text-slate-500">Loading users...</p>
          ) : recentUsers.length === 0 ? (
            <p className="px-6 py-5 text-sm text-slate-500">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#2d313a] text-left">
                <thead className="bg-[#141925] text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">User</th>
                    <th className="px-6 py-3 font-medium">Role</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Plan</th>
                    <th className="px-6 py-3 font-medium">Generations</th>
                    <th className="px-6 py-3 font-medium">Created</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242833] text-sm text-slate-200">
                  {recentUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-100">{user.name ?? "Unnamed user"}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full border px-2 py-1 text-xs capitalize ${
                            user.isAdmin
                              ? "border-cyan-600/40 bg-cyan-500/10 text-cyan-300"
                              : "border-[#2d313a] bg-[#11141b] text-slate-300"
                          }`}
                        >
                          {user.isAdmin ? "admin" : user.primaryRole}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2 py-1 text-xs capitalize ${getStatusClasses(user.accountStatus)}`}>
                          {user.accountStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={user.planKey}
                          onChange={(event) => {
                            void updateUserPlan(user, event.target.value);
                          }}
                          disabled={isUpdating === `plan:${user.id}`}
                          className="rounded-md border border-[#2d333b] bg-[#0f1115] px-2 py-1 text-xs text-slate-100 focus:border-[#14b8a6] focus:outline-none disabled:opacity-60"
                        >
                          {PLAN_OPTIONS.map((planKey) => (
                            <option key={planKey} value={planKey}>
                              {planKey}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{user.generationCount}</td>
                      <td className="px-6 py-4 text-slate-400">{formatDateTime(user.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {user.accountStatus.toLowerCase() === "active" ? (
                            <button
                              type="button"
                              onClick={() => {
                                void updateUserStatus(user, "suspended");
                              }}
                              disabled={isUpdating === `status:${user.id}`}
                              className="rounded-md border border-rose-700/50 bg-rose-950/30 px-2 py-1 text-xs text-rose-300 hover:bg-rose-900/40 disabled:opacity-60"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                void updateUserStatus(user, "active");
                              }}
                              disabled={isUpdating === `status:${user.id}`}
                              className="rounded-md border border-emerald-700/50 bg-emerald-950/30 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-900/40 disabled:opacity-60"
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
      </div>
    </main>
  );
}
