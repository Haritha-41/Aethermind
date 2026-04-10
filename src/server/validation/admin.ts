import { z } from "zod";

export const adminDashboardQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  generationKind: z
    .enum(["all", "text", "image", "code", "video", "conversation"])
    .default("all"),
});

export const adminUserIdSchema = z.object({
  userId: z.string().min(5, "Invalid user id."),
});

export const adminUpdateUserStatusSchema = z.object({
  accountStatus: z.enum(["active", "suspended"]),
});

export const adminUpdateUserPlanSchema = z.object({
  planKey: z.enum(["basic", "pro", "enterprise"]),
});

export type AdminDashboardQueryInput = z.infer<typeof adminDashboardQuerySchema>;
export type AdminUserIdInput = z.infer<typeof adminUserIdSchema>;
export type AdminUpdateUserStatusInput = z.infer<typeof adminUpdateUserStatusSchema>;
export type AdminUpdateUserPlanInput = z.infer<typeof adminUpdateUserPlanSchema>;
