export const AUTH_COOKIE_NAME = "aethermind_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export const PROTECTED_ROUTE_PREFIXES = ["/dashboard", "/admin"] as const;
export const PUBLIC_AUTH_ROUTES = ["/login", "/signup"] as const;
export const PUBLIC_ADMIN_AUTH_ROUTES = ["/admin/login"] as const;
