import { SignJWT, jwtVerify } from "jose";

import { getAuthSecret } from "@/lib/config/env";
import {
  AUTH_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from "@/lib/constants/auth";

import type { SessionPayload } from "./types";

const encoder = new TextEncoder();

function getSecretKey(): Uint8Array {
  return encoder.encode(getAuthSecret());
}

export async function createSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.sub || typeof payload.email !== "string") {
      return null;
    }

    return {
      userId: payload.sub,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  };
}

export { AUTH_COOKIE_NAME };
