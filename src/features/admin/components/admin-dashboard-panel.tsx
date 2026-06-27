"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  AdminDashboardResponseDto,
  AdminDashboardUserRowDto,
  AdminErrorDto,
} from "@/types/admin";

const DAY_OPTIONS = [7, 30, 90];
const PLAN_OPTIONS = ["basic", "pro", "enterprise"];

const KIND_COLORS: Record<string, string> = {
  image: "#D2685F",
  code: "#C08A2E",
  video: "#5A7FD6",
  audio: "#8A6FD0",
  conversation: "#0E9F77",
  unknown: "#B0B0A8",
};

const AVATAR_TINTS: [string, string][] = [
  ["#E7F4EF", "#0E9F77"],
  ["#FBECEC", "#D2685F"],
  ["#E9EFFB", "#5A7FD6"],
  ["#F0EBFB", "#8A6FD0"],
];

async function parseAdminErrorResponse(response: Response): Promise<AdminErrorDto> {
  try {
    return (await response.json()) as AdminErrorDto;
  } catch {
    return { error: `Request failed with status ${response.status}.` };
  }
}

function initialsOf(name: string | null): string {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((token) => token.charAt(0).toUpperCase())
      .join("");
  }
  return "U";
}

function KpiCard({
  label,
  value,
  delta,
  deltaColor,
}: {
  label: string;
  value: string;
  delta: string;
  deltaColor: string;
}) {
  return (
    <div className="rounded-[18px] border border-[#ECECE8] bg-white px-5 py-[18px] shadow-[0_1px_2px_rgba(20,20,18,0.03)]">
      <div className="mb-[10px] text-[12.5px] font-medium text-[#8C8C84]">{label}</div>
      <div className="text-[28px] font-semibold tracking-[-0.02em]">{value}</div>
      <div className="mt-[5px] text-[12px] font-semibold" style={{ color: deltaColor }}>
        {delta}
      </div>
    </div>
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
      const response = await fetch(`/api/admin/dashboard?days=${days}&generationKind=all`, {
        method: "GET",
        cache: "no-store",
      });

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

  // bar chart from token usage by kind
  const maxTokens = Math.max(...tokenRows.map((row) => row[1]), 1);

  // donut from generation kind distribution
  const genTotal = generationRows.reduce((sum, row) => sum + row[1], 0);
  let acc = 0;
  const donutStops = generationRows.map(([kind, count]) => {
    const start = acc;
    const pct = genTotal > 0 ? (count / genTotal) * 100 : 0;
    acc += pct;
    return `${KIND_COLORS[kind] ?? KIND_COLORS.unknown} ${start}% ${acc}%`;
  });
  const donutBg = donutStops.length > 0 ? `conic-gradient(${donutStops.join(",")})` : "#ECECE8";

  return (
    <div className="mx-auto max-w-[1180px] px-9 pb-14 pt-[30px]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="m-0 mb-[3px] text-[25px] font-semibold tracking-[-0.025em]">Analytics</h1>
          <div className="text-[13px] text-[#9A9A92]">
            Platform usage across all models · last {days} days
          </div>
        </div>
        <div className="relative">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="appearance-none rounded-[10px] border border-[#ECECE8] bg-white py-2 pl-[13px] pr-9 text-[13px] font-medium text-[#3A3A36] shadow-[0_1px_2px_rgba(20,20,18,0.03)] outline-none"
          >
            {DAY_OPTIONS.map((val) => (
              <option key={val} value={val}>
                Last {val} days
              </option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0B0A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>

      {errorMessage ? (
        <p className="mb-4 rounded-xl border border-[#F0C9C4] bg-[#FBECEC] px-4 py-2.5 text-[13px] text-[#B3473D]">
          {errorMessage}
        </p>
      ) : null}

      {/* KPI row */}
      <div className="mb-4 grid grid-cols-4 gap-4">
        <KpiCard label="Total generations" value={String(payload?.stats.generationCount ?? 0)} delta={`Within last ${days} days`} deltaColor="#13A77E" />
        <KpiCard label="Active users" value={String(payload?.stats.activeUsers ?? 0)} delta="Currently active" deltaColor="#13A77E" />
        <KpiCard label="Total tokens" value={String(payload?.stats.tokenCount ?? 0)} delta={`Within last ${days} days`} deltaColor="#9A9A92" />
        <KpiCard label="Suspended users" value={String(payload?.stats.suspendedUsers ?? 0)} delta="Currently restricted" deltaColor="#C0683E" />
      </div>

      {/* charts bento */}
      <div className="mb-4 grid grid-cols-[2fr_1fr] gap-4">
        <div className="rounded-[20px] border border-[#ECECE8] bg-white p-[22px] shadow-[0_1px_2px_rgba(20,20,18,0.03)]">
          <div className="mb-5 flex items-baseline justify-between">
            <h3 className="m-0 text-[15px] font-semibold">Usage by type</h3>
            <span className="text-[12.5px] font-semibold text-[#9A9A92]">tokens · last {days} days</span>
          </div>
          <div className="flex h-[180px] items-end gap-[10px]">
            {isLoading ? (
              <p className="m-auto text-[13px] text-[#9A9A92]">Loading chart…</p>
            ) : tokenRows.length === 0 ? (
              <p className="m-auto text-[13px] text-[#9A9A92]">No data</p>
            ) : (
              tokenRows.map(([kind, count]) => (
                <div key={kind} className="flex h-full flex-1 flex-col justify-end" title={`${kind}: ${count}`}>
                  <div
                    className="w-full rounded-[6px_6px_3px_3px]"
                    style={{
                      height: `${Math.max((count / maxTokens) * 100, 6)}%`,
                      background: `linear-gradient(180deg, ${KIND_COLORS[kind] ?? KIND_COLORS.unknown}, ${KIND_COLORS[kind] ?? KIND_COLORS.unknown}99)`,
                    }}
                  />
                  <div className="mt-2 truncate text-center text-[11px] capitalize text-[#B0B0A8]">{kind}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[20px] border border-[#ECECE8] bg-white p-[22px] shadow-[0_1px_2px_rgba(20,20,18,0.03)]">
          <h3 className="m-0 mb-[18px] text-[15px] font-semibold">By type</h3>
          <div className="mb-[18px] flex items-center justify-center">
            <div className="relative h-[130px] w-[130px] rounded-full" style={{ background: donutBg }}>
              <div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-white">
                <div className="text-[20px] font-semibold tracking-[-0.02em]">{genTotal}</div>
                <div className="text-[10.5px] text-[#9A9A92]">total</div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-[9px]">
            {generationRows.length === 0 ? (
              <p className="text-center text-[13px] text-[#9A9A92]">No data</p>
            ) : (
              generationRows.map(([kind, count]) => {
                const pct = genTotal > 0 ? Math.round((count / genTotal) * 100) : 0;
                return (
                  <div key={kind} className="flex items-center gap-[9px]">
                    <span className="h-[9px] w-[9px] shrink-0 rounded-[3px]" style={{ background: KIND_COLORS[kind] ?? KIND_COLORS.unknown }} />
                    <span className="flex-1 text-[13px] capitalize text-[#33332E]">{kind}</span>
                    <span className="text-[13px] font-semibold text-[#6E6E68]">{pct}%</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* users table */}
      <div className="overflow-hidden rounded-[20px] border border-[#ECECE8] bg-white shadow-[0_1px_2px_rgba(20,20,18,0.03)]">
        <div className="flex items-center justify-between border-b border-[#F1F1ED] px-[22px] py-[18px]">
          <h3 className="m-0 text-[15px] font-semibold">Top users</h3>
          <button onClick={() => void loadDashboard()} className="text-[12.5px] font-semibold text-[#0E9F77]">
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-[2.2fr_1fr_1.3fr_1fr] border-b border-[#F1F1ED] px-[22px] py-[11px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#A6A69E]">
          <span>User</span>
          <span>Plan</span>
          <span>Usage</span>
          <span className="text-right">Actions</span>
        </div>

        {isLoading ? (
          <p className="px-[22px] py-5 text-[13px] text-[#9A9A92]">Loading users…</p>
        ) : recentUsers.length === 0 ? (
          <p className="px-[22px] py-5 text-[13px] text-[#9A9A92]">No users found.</p>
        ) : (
          recentUsers.map((user, index) => {
            const [avBg, avFg] = AVATAR_TINTS[index % AVATAR_TINTS.length];
            const isActive = user.accountStatus.toLowerCase() === "active";
            return (
              <div key={user.id} className="grid grid-cols-[2.2fr_1fr_1.3fr_1fr] items-center border-b border-[#F4F4F0] px-[22px] py-[14px]">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[12.5px] font-semibold" style={{ background: avBg, color: avFg }}>
                    {initialsOf(user.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-semibold">{user.name ?? "Unnamed user"}</div>
                    <div className="truncate text-[12px] text-[#9A9A92]">{user.email}</div>
                  </div>
                </div>
                <div>
                  <select
                    value={user.planKey}
                    onChange={(e) => void updateUserPlan(user, e.target.value)}
                    disabled={isUpdating === `plan:${user.id}`}
                    className="cursor-pointer rounded-md border border-[#E6E6E1] bg-white px-2 py-1 text-[12px] capitalize text-[#33332E] outline-none disabled:opacity-60"
                  >
                    {PLAN_OPTIONS.map((planKey) => (
                      <option key={planKey} value={planKey}>
                        {planKey}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-[13px] text-[#33332E]">{user.generationCount.toLocaleString()} req / mo</span>
                <div className="flex items-center justify-end gap-3 text-[12.5px] font-semibold">
                  {isActive ? (
                    <>
                      <span className="rounded-[7px] bg-[#E7F4EF] px-[10px] py-[3px] text-[12px] font-semibold text-[#13A77E]">Active</span>
                      <button
                        type="button"
                        onClick={() => updateUserStatus(user, "suspended")}
                        disabled={isUpdating === `status:${user.id}`}
                        className="text-[#C0683E] disabled:opacity-50"
                      >
                        Suspend
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="rounded-[7px] bg-[#FBEFE6] px-[10px] py-[3px] text-[12px] font-semibold text-[#C0683E]">Suspended</span>
                      <button
                        type="button"
                        onClick={() => updateUserStatus(user, "active")}
                        disabled={isUpdating === `status:${user.id}`}
                        className="text-[#0E9F77] disabled:opacity-50"
                      >
                        Activate
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
