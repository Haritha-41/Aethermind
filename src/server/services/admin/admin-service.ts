import type { ConvexHttpClient } from "convex/browser";

import { getConvexServerAccessKey } from "@/lib/config/env";
import { getConvexClient } from "@/server/convex/client";
import { convexFunctions } from "@/server/convex/functions";
import { logger } from "@/server/logging/logger";
import type { AdminDashboardResponseDto } from "@/types/admin";

import type {
  AdminDashboardQueryInput,
  AdminUpdateUserPlanInput,
  AdminUpdateUserStatusInput,
} from "@/server/validation/admin";

export class AdminServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AdminServiceError";
  }
}

type ConvexQueryReference = Parameters<ConvexHttpClient["query"]>[0];
type ConvexActionReference = Parameters<ConvexHttpClient["action"]>[0];
type ConvexMutationReference = Parameters<ConvexHttpClient["mutation"]>[0];

function toConvexQueryReference(functionName: string): ConvexQueryReference {
  return functionName as unknown as ConvexQueryReference;
}

function toConvexActionReference(functionName: string): ConvexActionReference {
  return functionName as unknown as ConvexActionReference;
}

function toConvexMutationReference(functionName: string): ConvexMutationReference {
  return functionName as unknown as ConvexMutationReference;
}

function toAdminServiceError(error: unknown): AdminServiceError {
  if (error instanceof AdminServiceError) {
    return error;
  }

  const message = error instanceof Error ? error.message : "Unexpected server error.";

  if (message.includes("Unsupported")) {
    return new AdminServiceError(message, 400, "ADMIN_INVALID_INPUT");
  }

  if (message.includes("User does not exist")) {
    return new AdminServiceError("User not found.", 404, "ADMIN_USER_NOT_FOUND");
  }

  return new AdminServiceError("Unexpected server error.", 500, "ADMIN_UNEXPECTED");
}

export async function getAdminDashboardSnapshot(
  filters: AdminDashboardQueryInput,
): Promise<AdminDashboardResponseDto> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();

  try {
    const payload = (await convexClient.query(
      toConvexQueryReference(convexFunctions.admin.getDashboardSnapshot),
      {
        serverAccessKey,
        days: filters.days,
        generationKind: filters.generationKind,
      },
    )) as AdminDashboardResponseDto;

    return payload;
  } catch (error) {
    throw toAdminServiceError(error);
  }
}

export async function updateUserAccountStatusAsAdmin(
  adminUserId: string,
  targetUserId: string,
  input: AdminUpdateUserStatusInput,
): Promise<void> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();

  if (adminUserId === targetUserId && input.accountStatus === "suspended") {
    throw new AdminServiceError("You cannot suspend your own account.", 400, "ADMIN_SELF_SUSPEND");
  }

  try {
    await convexClient.mutation(
      toConvexMutationReference(convexFunctions.admin.setUserAccountStatus),
      {
        serverAccessKey,
        userId: targetUserId,
        accountStatus: input.accountStatus,
      },
    );

    logger.info("admin.user.status.updated", {
      adminUserId,
      targetUserId,
      accountStatus: input.accountStatus,
    });
  } catch (error) {
    throw toAdminServiceError(error);
  }
}

export async function updateUserPlanAsAdmin(
  adminUserId: string,
  targetUserId: string,
  input: AdminUpdateUserPlanInput,
): Promise<void> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();

  try {
    await convexClient.action(
      toConvexActionReference(convexFunctions.admin.setUserPlanAsAdmin),
      {
        serverAccessKey,
        userId: targetUserId,
        planKey: input.planKey,
      },
    );

    logger.info("admin.user.plan.updated", {
      adminUserId,
      targetUserId,
      planKey: input.planKey,
    });
  } catch (error) {
    throw toAdminServiceError(error);
  }
}
