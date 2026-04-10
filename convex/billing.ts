import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { assertServerAccessKey } from "./security";

const DEFAULT_PLAN_KEY = "basic";
const ACTIVE_PLAN_STATUS = "active";
const USAGE_METRIC_GENERATION = "generation";
const USAGE_METRIC_TOKENS = "tokens";

const usageMetricValidator = v.union(
  v.literal(USAGE_METRIC_GENERATION),
  v.literal(USAGE_METRIC_TOKENS),
);

const DEFAULT_PLAN_CATALOG = {
  basic: {
    name: "Basic",
    monthlyGenerationLimit: 100,
    monthlyTokenLimit: 200_000,
    monthlyPriceCents: 0,
  },
  pro: {
    name: "Pro",
    monthlyGenerationLimit: 2_000,
    monthlyTokenLimit: 4_000_000,
    monthlyPriceCents: 2_000,
  },
  enterprise: {
    name: "Enterprise",
    monthlyGenerationLimit: 20_000,
    monthlyTokenLimit: 40_000_000,
    monthlyPriceCents: 12_000,
  },
} as const;

type PlanKey = keyof typeof DEFAULT_PLAN_CATALOG;

function isKnownPlanKey(value: string): value is PlanKey {
  return Object.hasOwn(DEFAULT_PLAN_CATALOG, value);
}

function getMonthlyPeriod(timestampMs: number): {
  periodStartMs: number;
  periodEndMs: number;
} {
  const date = new Date(timestampMs);
  const periodStartMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  const periodEndMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);

  return {
    periodStartMs,
    periodEndMs,
  };
}

function getLimitForMetric(
  metric: string,
  plan: {
    monthlyGenerationLimit: number;
    monthlyTokenLimit?: number;
  },
): number | undefined {
  if (metric === USAGE_METRIC_GENERATION) {
    return plan.monthlyGenerationLimit;
  }

  if (metric === USAGE_METRIC_TOKENS) {
    return plan.monthlyTokenLimit;
  }

  return undefined;
}

export const seedDefaultPlans = mutation({
  args: {
    serverAccessKey: v.string(),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const now = Date.now();

    for (const [key, config] of Object.entries(DEFAULT_PLAN_CATALOG)) {
      const existingPlan = await ctx.db
        .query("plans")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();

      if (existingPlan) {
        await ctx.db.patch(existingPlan._id, {
          name: config.name,
          monthlyGenerationLimit: config.monthlyGenerationLimit,
          monthlyTokenLimit: config.monthlyTokenLimit,
          monthlyPriceCents: config.monthlyPriceCents,
          isActive: true,
          updatedAt: now,
        });
        continue;
      }

      await ctx.db.insert("plans", {
        key,
        name: config.name,
        monthlyGenerationLimit: config.monthlyGenerationLimit,
        monthlyTokenLimit: config.monthlyTokenLimit,
        monthlyPriceCents: config.monthlyPriceCents,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const listPlans = query({
  args: {
    serverAccessKey: v.string(),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    return ctx.db.query("plans").collect();
  },
});

export const getCurrentUserPlan = query({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    asOfMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const asOfMs = args.asOfMs ?? Date.now();
    const userPlans = await ctx.db
      .query("userPlans")
      .withIndex("by_user_status", (q) => q.eq("userId", args.userId))
      .collect();

    const matchingPlan = userPlans.find(
      (plan) =>
        plan.status === ACTIVE_PLAN_STATUS &&
        plan.periodStartMs <= asOfMs &&
        asOfMs < plan.periodEndMs,
    );

    if (!matchingPlan) {
      return null;
    }

    const plan = await ctx.db
      .query("plans")
      .withIndex("by_key", (q) => q.eq("key", matchingPlan.planKey))
      .unique();

    return {
      subscription: matchingPlan,
      plan,
    };
  },
});

export const setUserPlan = mutation({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    planKey: v.string(),
    startAtMs: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    if (!isKnownPlanKey(args.planKey)) {
      throw new ConvexError("Unsupported plan key.");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User does not exist.");
    }

    const now = Date.now();
    const planConfig = DEFAULT_PLAN_CATALOG[args.planKey];
    const existingPlan = await ctx.db
      .query("plans")
      .withIndex("by_key", (q) => q.eq("key", args.planKey))
      .unique();

    if (!existingPlan) {
      await ctx.db.insert("plans", {
        key: args.planKey,
        name: planConfig.name,
        monthlyGenerationLimit: planConfig.monthlyGenerationLimit,
        monthlyTokenLimit: planConfig.monthlyTokenLimit,
        monthlyPriceCents: planConfig.monthlyPriceCents,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    const userPlans = await ctx.db
      .query("userPlans")
      .withIndex("by_user_status", (q) => q.eq("userId", args.userId))
      .collect();

    for (const activePlan of userPlans.filter(
      (plan) => plan.status === ACTIVE_PLAN_STATUS,
    )) {
      await ctx.db.patch(activePlan._id, {
        status: "replaced",
        updatedAt: now,
      });
    }

    const startAtMs = args.startAtMs ?? now;
    const { periodStartMs, periodEndMs } = getMonthlyPeriod(startAtMs);
    const subscriptionId = await ctx.db.insert("userPlans", {
      userId: args.userId,
      planKey: args.planKey,
      status: ACTIVE_PLAN_STATUS,
      periodStartMs,
      periodEndMs,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd ?? false,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.userId, {
      primaryRole: args.planKey === "enterprise" ? "enterprise_user" : "user",
      updatedAt: now,
    });

    return subscriptionId;
  },
});

export const grantAdminRole = mutation({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    grantedByUserId: v.optional(v.id("users")),
    permissions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User does not exist.");
    }

    const now = Date.now();
    const adminRecord = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (adminRecord) {
      await ctx.db.patch(adminRecord._id, {
        grantedByUserId: args.grantedByUserId,
        permissions: args.permissions ?? adminRecord.permissions,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("admins", {
        userId: args.userId,
        grantedByUserId: args.grantedByUserId,
        permissions: args.permissions ?? [],
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.userId, {
      primaryRole: "admin",
      updatedAt: now,
    });
  },
});

export const revokeAdminRole = mutation({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const adminRecord = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (adminRecord) {
      await ctx.db.delete(adminRecord._id);
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      return;
    }

    await ctx.db.patch(args.userId, {
      primaryRole: "user",
      updatedAt: Date.now(),
    });
  },
});

export const getUsageSummary = query({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    metric: usageMetricValidator,
    periodStartMs: v.number(),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const summaries = await ctx.db
      .query("usageSummaries")
      .withIndex("by_user_metric_period", (q) => q.eq("userId", args.userId))
      .collect();

    return (
      summaries.find(
        (summary) =>
          summary.metric === args.metric &&
          summary.periodStartMs === args.periodStartMs,
      ) ?? null
    );
  },
});

export const trackUsageAndEnforcePlan = mutation({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
    metric: usageMetricValidator,
    units: v.number(),
    metadata: v.optional(v.any()),
    occurredAtMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    if (args.units <= 0) {
      throw new ConvexError("Usage units must be greater than 0.");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User does not exist.");
    }

    const occurredAtMs = args.occurredAtMs ?? Date.now();
    const now = Date.now();
    const { periodStartMs, periodEndMs } = getMonthlyPeriod(occurredAtMs);

    const userPlans = await ctx.db
      .query("userPlans")
      .withIndex("by_user_status", (q) => q.eq("userId", args.userId))
      .collect();

    let activePlan = userPlans.find(
      (plan) =>
        plan.status === ACTIVE_PLAN_STATUS &&
        plan.periodStartMs <= occurredAtMs &&
        occurredAtMs < plan.periodEndMs,
    );

    if (!activePlan) {
      const existingBasicPlan = await ctx.db
        .query("plans")
        .withIndex("by_key", (q) => q.eq("key", DEFAULT_PLAN_KEY))
        .unique();

      if (!existingBasicPlan) {
        const defaultPlan = DEFAULT_PLAN_CATALOG.basic;
        await ctx.db.insert("plans", {
          key: DEFAULT_PLAN_KEY,
          name: defaultPlan.name,
          monthlyGenerationLimit: defaultPlan.monthlyGenerationLimit,
          monthlyTokenLimit: defaultPlan.monthlyTokenLimit,
          monthlyPriceCents: defaultPlan.monthlyPriceCents,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }

      const subscriptionId = await ctx.db.insert("userPlans", {
        userId: args.userId,
        planKey: DEFAULT_PLAN_KEY,
        status: ACTIVE_PLAN_STATUS,
        periodStartMs,
        periodEndMs,
        cancelAtPeriodEnd: false,
        createdAt: now,
        updatedAt: now,
      });

      activePlan = (await ctx.db.get(subscriptionId)) ?? undefined;
    }

    if (!activePlan) {
      throw new ConvexError("Unable to resolve active plan.");
    }

    const plan = await ctx.db
      .query("plans")
      .withIndex("by_key", (q) => q.eq("key", activePlan.planKey))
      .unique();

    if (!plan || !plan.isActive) {
      throw new ConvexError("Active subscription references an invalid plan.");
    }

    const summaries = await ctx.db
      .query("usageSummaries")
      .withIndex("by_user_metric_period", (q) => q.eq("userId", args.userId))
      .collect();

    const summary =
      summaries.find(
        (item) =>
          item.metric === args.metric && item.periodStartMs === periodStartMs,
      ) ?? null;

    const unitsConsumed = (summary?.unitsConsumed ?? 0) + args.units;
    const unitsLimit = getLimitForMetric(args.metric, {
      monthlyGenerationLimit: plan.monthlyGenerationLimit,
      monthlyTokenLimit: plan.monthlyTokenLimit,
    });

    if (unitsLimit !== undefined && unitsConsumed > unitsLimit) {
      throw new ConvexError("Plan usage limit exceeded.");
    }

    await ctx.db.insert("usageEvents", {
      userId: args.userId,
      planKey: activePlan.planKey,
      metric: args.metric,
      units: args.units,
      periodStartMs,
      periodEndMs,
      metadata: args.metadata,
      createdAt: occurredAtMs,
    });

    if (summary) {
      await ctx.db.patch(summary._id, {
        planKey: activePlan.planKey,
        periodEndMs,
        unitsConsumed,
        unitsLimit,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("usageSummaries", {
        userId: args.userId,
        planKey: activePlan.planKey,
        metric: args.metric,
        periodStartMs,
        periodEndMs,
        unitsConsumed,
        unitsLimit,
        updatedAt: now,
      });
    }

    return {
      planKey: activePlan.planKey,
      metric: args.metric,
      unitsConsumed,
      unitsLimit,
      unitsRemaining:
        unitsLimit === undefined ? null : Math.max(unitsLimit - unitsConsumed, 0),
      periodStartMs,
      periodEndMs,
    };
  },
});
