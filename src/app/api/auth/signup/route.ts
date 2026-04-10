import { NextResponse } from "next/server";

import { enforceRateLimit, getRequestIp } from "@/server/security/rate-limit";
import { registerUser } from "@/server/services/auth/auth-service";
import {
  createAuthErrorResponse,
  createInvalidJsonResponse,
} from "@/server/services/auth/http";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  getSessionCookieOptions,
} from "@/server/services/auth/session";
import { signupSchema } from "@/server/validation/auth";

export async function POST(request: Request): Promise<NextResponse> {
  const rateLimit = enforceRateLimit({
    key: `auth:signup:${getRequestIp(request)}`,
    limit: 6,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please wait and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return createInvalidJsonResponse();
  }

  try {
    const input = signupSchema.parse(body);
    const user = await registerUser(input);
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
    });

    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions());
    return response;
  } catch (error) {
    return createAuthErrorResponse("signup", error);
  }
}
