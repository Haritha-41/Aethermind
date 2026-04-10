import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ConvexHttpClient } from "convex/browser";

import { getConvexServerAccessKey } from "@/lib/config/env";
import { getConvexClient } from "@/server/convex/client";
import { convexFunctions } from "@/server/convex/functions";

import { AUTH_COOKIE_NAME, verifySessionToken } from "./session";
import type { AuthUser } from "./types";

type ConvexQueryReference = Parameters<ConvexHttpClient["query"]>[0];

function toConvexQueryReference(functionName: string): ConvexQueryReference {
  return functionName as unknown as ConvexQueryReference;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return null;
  }

  const convexClient = getConvexClient();
  const serverAccessKey = getConvexServerAccessKey();
  const user = (await convexClient.query(
    toConvexQueryReference(convexFunctions.users.getUserById),
    { serverAccessKey, userId: session.userId },
  )) as AuthUser | null;

  if (!user) {
    return null;
  }
  if (user.accountStatus !== "active") {
    return null;
  }

  return user;
}

export async function requireCurrentUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdminUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }

  if (!user.isAdmin) {
    redirect("/dashboard");
  }

  return user;
}
