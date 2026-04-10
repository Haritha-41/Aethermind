import type { ConvexHttpClient } from "convex/browser";

import { getConvexServerAccessKey } from "@/lib/config/env";
import { getConvexClient } from "@/server/convex/client";
import { convexFunctions } from "@/server/convex/functions";
import { logger } from "@/server/logging/logger";
import type { LoginInput, SignupInput } from "@/server/validation/auth";

import { hashPassword, verifyPassword } from "./password";
import type { AuthUser } from "./types";

export class AuthServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AuthServiceError";
  }
}

function toAuthUser(user: {
  id: string;
  email: string;
  name: string | null;
  accountStatus: string;
  primaryRole: string;
  isAdmin: boolean;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    accountStatus: user.accountStatus,
    primaryRole: user.primaryRole,
    isAdmin: user.isAdmin,
  };
}

type ConvexAuthUser = {
  id: string;
  email: string;
  name: string | null;
  accountStatus: string;
  primaryRole: string;
  isAdmin: boolean;
};

type ConvexAuthUserWithPassword = ConvexAuthUser & {
  passwordHash: string;
};

type ConvexQueryReference = Parameters<ConvexHttpClient["query"]>[0];
type ConvexMutationReference = Parameters<ConvexHttpClient["mutation"]>[0];

function toConvexQueryReference(functionName: string): ConvexQueryReference {
  return functionName as unknown as ConvexQueryReference;
}

function toConvexMutationReference(functionName: string): ConvexMutationReference {
  return functionName as unknown as ConvexMutationReference;
}

export async function registerUser(input: SignupInput): Promise<AuthUser> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();
  const existingUser = (await convexClient.query(
    toConvexQueryReference(convexFunctions.users.getUserByEmail),
    { serverAccessKey, email: input.email },
  )) as ConvexAuthUser | null;

  if (existingUser) {
    throw new AuthServiceError("An account with this email already exists.", 409, "EMAIL_EXISTS");
  }

  const passwordHash = await hashPassword(input.password);
  let user: ConvexAuthUser;
  try {
    user = (await convexClient.mutation(
      toConvexMutationReference(convexFunctions.users.createUser),
      {
        serverAccessKey,
        email: input.email,
        name: input.name,
        passwordHash,
      },
    )) as ConvexAuthUser;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("already exists")) {
      throw new AuthServiceError(
        "An account with this email already exists.",
        409,
        "EMAIL_EXISTS",
      );
    }

    throw error;
  }

  logger.info("auth.signup.success", { userId: user.id });
  return toAuthUser(user);
}

export async function authenticateUser(input: LoginInput): Promise<AuthUser> {
  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();
  const user = (await convexClient.query(
    toConvexQueryReference(convexFunctions.users.getUserByEmailWithPassword),
    { serverAccessKey, email: input.email },
  )) as ConvexAuthUserWithPassword | null;

  if (!user) {
    throw new AuthServiceError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  }

  const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AuthServiceError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  }

  if (user.accountStatus !== "active") {
    throw new AuthServiceError(
      "Your account is currently suspended. Contact support.",
      403,
      "ACCOUNT_SUSPENDED",
    );
  }

  logger.info("auth.login.success", { userId: user.id });
  return toAuthUser(user);
}

export async function authenticateAdminUser(input: LoginInput): Promise<AuthUser> {
  const user = await authenticateUser(input);
  if (!user.isAdmin) {
    throw new AuthServiceError(
      "Admin access is not enabled for this account.",
      403,
      "ADMIN_ACCESS_REQUIRED",
    );
  }

  logger.info("auth.admin.login.success", { userId: user.id });
  return user;
}
