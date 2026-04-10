import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { assertServerAccessKey } from "./security";

const DEFAULT_PLAN_KEY = "basic";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toUserDto(user: {
  _id: string;
  email: string;
  name?: string;
  accountStatus?: string;
  primaryRole?: string;
  isAdmin?: boolean;
}) {
  return {
    id: user._id,
    email: user.email,
    name: user.name ?? null,
    accountStatus: user.accountStatus ?? "active",
    primaryRole: user.primaryRole ?? "user",
    isAdmin: user.isAdmin ?? user.primaryRole === "admin",
  };
}

export const getUserByEmail = query({
  args: {
    serverAccessKey: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const email = normalizeEmail(args.email);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!user) {
      return null;
    }

    const adminRecord = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    return toUserDto({
      ...(user as {
        _id: string;
        email: string;
        name?: string;
        accountStatus?: string;
        primaryRole?: string;
      }),
      isAdmin: Boolean(adminRecord) || user.primaryRole === "admin",
    });
  },
});

export const getUserByEmailWithPassword = query({
  args: {
    serverAccessKey: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const email = normalizeEmail(args.email);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!user) {
      return null;
    }

    const adminRecord = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const dto = toUserDto({
      ...(user as {
        _id: string;
        email: string;
        name?: string;
        accountStatus?: string;
        primaryRole?: string;
      }),
      isAdmin: Boolean(adminRecord) || user.primaryRole === "admin",
    });
    return {
      ...dto,
      passwordHash: user.passwordHash,
    };
  },
});

export const getUserById = query({
  args: {
    serverAccessKey: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    const adminRecord = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    return toUserDto({
      ...(user as {
        _id: string;
        email: string;
        name?: string;
        accountStatus?: string;
        primaryRole?: string;
      }),
      isAdmin: Boolean(adminRecord) || user.primaryRole === "admin",
    });
  },
});

export const createUser = mutation({
  args: {
    serverAccessKey: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    assertServerAccessKey(args.serverAccessKey);
    const email = normalizeEmail(args.email);
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existingUser) {
      throw new ConvexError("An account with this email already exists.");
    }

    const now = Date.now();
    const nowDate = new Date(now);
    const periodStartMs = Date.UTC(
      nowDate.getUTCFullYear(),
      nowDate.getUTCMonth(),
      1,
    );
    const periodEndMs = Date.UTC(
      nowDate.getUTCFullYear(),
      nowDate.getUTCMonth() + 1,
      1,
    );

    const basicPlan = await ctx.db
      .query("plans")
      .withIndex("by_key", (q) => q.eq("key", DEFAULT_PLAN_KEY))
      .unique();

    if (!basicPlan) {
      await ctx.db.insert("plans", {
        key: DEFAULT_PLAN_KEY,
        name: "Basic",
        monthlyGenerationLimit: 100,
        monthlyTokenLimit: 200_000,
        monthlyPriceCents: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    const userId = await ctx.db.insert("users", {
      email,
      name: args.name?.trim() || undefined,
      passwordHash: args.passwordHash,
      accountStatus: "active",
      primaryRole: "user",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("userPlans", {
      userId,
      planKey: DEFAULT_PLAN_KEY,
      status: "active",
      periodStartMs,
      periodEndMs,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: userId,
      email,
      name: args.name?.trim() || null,
      accountStatus: "active",
      primaryRole: "user",
      isAdmin: false,
    };
  },
});
