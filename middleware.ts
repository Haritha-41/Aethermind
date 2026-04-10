import { type NextRequest, NextResponse } from "next/server";

import {
  PROTECTED_ROUTE_PREFIXES,
  PUBLIC_ADMIN_AUTH_ROUTES,
  PUBLIC_AUTH_ROUTES,
} from "@/lib/constants/auth";
import {
  AUTH_COOKIE_NAME,
  verifySessionToken,
} from "@/server/services/auth/session";

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicAdminAuthRoute = PUBLIC_ADMIN_AUTH_ROUTES.includes(
    pathname as (typeof PUBLIC_ADMIN_AUTH_ROUTES)[number],
  );
  const isProtectedRoute =
    matchesPrefix(pathname, PROTECTED_ROUTE_PREFIXES) && !isPublicAdminAuthRoute;
  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.includes(
    pathname as (typeof PUBLIC_AUTH_ROUTES)[number],
  );

  if (!isProtectedRoute && !isPublicAuthRoute && !isPublicAdminAuthRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (isProtectedRoute && !session) {
    const loginUrl = new URL(
      pathname.startsWith("/admin") ? "/admin/login" : "/login",
      request.url,
    );
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicAuthRoute && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/signup"],
};
