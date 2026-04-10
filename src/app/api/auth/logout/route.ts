import { NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
  getSessionCookieOptions,
} from "@/server/services/auth/session";

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
