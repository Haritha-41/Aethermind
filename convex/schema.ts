import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    passwordHash: v.string(),
    accountStatus: v.string(),
    primaryRole: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_account_status", ["accountStatus"])
    .index("by_created_at", ["createdAt"]),

  admins: defineTable({
    userId: v.id("users"),
    grantedByUserId: v.optional(v.id("users")),
    permissions: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  plans: defineTable({
    key: v.string(),
    name: v.string(),
    monthlyGenerationLimit: v.number(),
    monthlyTokenLimit: v.optional(v.number()),
    monthlyPriceCents: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  userPlans: defineTable({
    userId: v.id("users"),
    planKey: v.string(),
    status: v.string(),
    periodStartMs: v.number(),
    periodEndMs: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_status", ["userId", "status"])
    .index("by_user_period_start", ["userId", "periodStartMs"])
    .index("by_status", ["status"]),

  generations: defineTable({
    userId: v.id("users"),
    kind: v.string(),
    prompt: v.string(),
    output: v.string(),
    model: v.string(),
    tokensUsed: v.optional(v.number()),
    imageStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created_at", ["userId", "createdAt"])
    .index("by_user_kind_created_at", ["userId", "kind", "createdAt"])
    .index("by_created_at", ["createdAt"])
    .index("by_kind_created_at", ["kind", "createdAt"]),

  usageEvents: defineTable({
    userId: v.id("users"),
    planKey: v.string(),
    metric: v.string(),
    units: v.number(),
    periodStartMs: v.number(),
    periodEndMs: v.number(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_user_created_at", ["userId", "createdAt"])
    .index("by_user_metric_period", ["userId", "metric", "periodStartMs"])
    .index("by_created_at", ["createdAt"])
    .index("by_metric_created_at", ["metric", "createdAt"]),

  usageSummaries: defineTable({
    userId: v.id("users"),
    planKey: v.string(),
    metric: v.string(),
    periodStartMs: v.number(),
    periodEndMs: v.number(),
    unitsConsumed: v.number(),
    unitsLimit: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_user_metric_period", ["userId", "metric", "periodStartMs"]),
});
