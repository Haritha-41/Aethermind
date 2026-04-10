import { ConvexError, v } from "convex/values";

import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";
import { assertServerAccessKey } from "./security";

const SUPPORTED_GENERATION_KINDS = new Set([
  "text",
  "image",
  "code",
  "video",
  "conversation",
]);

function resolveDays(days: number | undefined): number {
  if (!days || Number.isNaN(days)) {
    return 30;
  }

  return Math.min(Math.max(Math.round(days), 1), 365);
}

function normalizeGenerationKind(kind: string | undefined): string | null {
  const raw = kind?.trim().toLowerCase();
  if (!raw || raw === "all") {
    return null;
  }

  if (!SUPPORTED_GENERATION_KINDS.has(raw)) {
    throw new ConvexError("Unsupported generation type filter.");
  }

  return raw;
}

function getCurrentUserPlanMap(
  userPlans: Array<{
    _id: string;
    userId: string;
    planKey: string;
    status: string;
    periodStartMs: number;
    periodEndMs: number;
  }>,
  asOfMs: number,
): Map<string, string> {
  const planByUser = new Map<string, string>();

  for (const plan of userPlans) {
    if (plan.status !== "active") {
      continue;
    }

    if (plan.periodStartMs <= asOfMs && asOfMs < plan.periodEndMs) {
      planByUser.set(plan.userId, plan.planKey);
    }
  }

  return planByUser;
}

export const getDashboardSnapshot = query({
  args: {
    serverAccessKey: v.string(),
    days: v.optional(v.number()),
    generationKind: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const now = Date.now();
    const days = resolveDays(args.days);
    const sinceMs = now - days * 24 * 60 * 60 * 1000;
    const generationKind = normalizeGenerationKind(args.generationKind);

    const [users, admins, userPlans, generations, tokenUsageEvents, recentUsersRaw] =
      await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("admins").collect(),
      ctx.db
        .query("userPlans")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .collect(),
      generationKind
        ? ctx.db
            .query("generations")
            .withIndex("by_kind_created_at", (q) =>
              q.eq("kind", generationKind).gte("createdAt", sinceMs),
            )
            .collect()
        : ctx.db
            .query("generations")
            .withIndex("by_created_at", (q) => q.gte("createdAt", sinceMs))
            .collect(),
      ctx.db
        .query("usageEvents")
        .withIndex("by_metric_created_at", (q) =>
          q.eq("metric", "tokens").gte("createdAt", sinceMs),
        )
        .collect(),
      ctx.db.query("users").withIndex("by_created_at").order("desc").take(20),
    ]);

    const adminUserIdSet = new Set(admins.map((item) => item.userId));
    const planByUser = getCurrentUserPlanMap(
      userPlans.map((item) => ({ ...item, userId: item.userId as string })),
      now,
    );

    const filteredGenerations = generations;

    const generationByKind = filteredGenerations.reduce<Record<string, number>>((acc, item) => {
      acc[item.kind] = (acc[item.kind] ?? 0) + 1;
      return acc;
    }, {});

    const tokensByKind = tokenUsageEvents.reduce<Record<string, number>>((acc, item) => {
      const kind = typeof item.metadata?.kind === "string" ? item.metadata.kind : "unknown";
      acc[kind] = (acc[kind] ?? 0) + item.units;
      return acc;
    }, {});

    const generationsByUser = filteredGenerations.reduce<Record<string, number>>((acc, item) => {
      const key = item.userId as string;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const latestGenerationByUser = filteredGenerations.reduce<Record<string, number>>((acc, item) => {
      const key = item.userId as string;
      acc[key] = Math.max(acc[key] ?? 0, item.createdAt);
      return acc;
    }, {});

    const recentUsers = recentUsersRaw.map((user) => ({
      id: user._id,
      email: user.email,
      name: user.name ?? null,
      accountStatus: user.accountStatus,
      primaryRole: user.primaryRole,
      isAdmin: user.primaryRole === "admin" || adminUserIdSet.has(user._id),
      createdAt: user.createdAt,
      planKey: planByUser.get(user._id as string) ?? "basic",
      generationCount: generationsByUser[user._id as string] ?? 0,
      lastGenerationAt: latestGenerationByUser[user._id as string] ?? null,
    }));

    const totalUsers = users.length;
    const activeUsers = users.filter((item) => item.accountStatus === "active").length;
    const suspendedUsers = users.filter((item) => item.accountStatus === "suspended").length;
    const totalAdmins = users.filter(
      (item) => item.primaryRole === "admin" || adminUserIdSet.has(item._id),
    ).length;

    return {
      filters: {
        days,
        generationKind: generationKind ?? "all",
      },
      stats: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        totalAdmins,
        generationCount: filteredGenerations.length,
        tokenCount: tokenUsageEvents.reduce((sum, item) => sum + item.units, 0),
      },
      generationByKind,
      tokensByKind,
      recentUsers,
    };
  },
});

export const setUserAccountStatus = mutation({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    accountStatus: v.string(),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    if (args.accountStatus !== "active" && args.accountStatus !== "suspended") {
      throw new ConvexError("Unsupported account status.");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User does not exist.");
    }

    await ctx.db.patch(args.userId, {
      accountStatus: args.accountStatus,
      updatedAt: Date.now(),
    });

    return {
      userId: args.userId,
      accountStatus: args.accountStatus,
    };
  },
});

export const setUserPlanAsAdmin = action({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    planKey: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(api.billing.setUserPlan, {
      serverAccessKey: args.serverAccessKey,
      userId: args.userId,
      planKey: args.planKey,
      startAtMs: Date.now(),
      cancelAtPeriodEnd: false,
    });

    return {
      userId: args.userId,
      planKey: args.planKey,
    };
  },
});
