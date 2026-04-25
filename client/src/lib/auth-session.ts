import type { NextRequest } from "next/server";
import type { Locale } from "@/i18n/config";

/**
 * HttpOnly JWT cookie (same name as backend) — set by `POST /api/auth/login`
 * from the backend `Set-Cookie` header.
 */
export const AUTH_JWT_COOKIE = "Authorization";

/** @deprecated Stale cookie from an older login flow; must not count as "logged in". */
export const AUTH_SESSION_COOKIE = "auth_session";

function hasJwt(
  get: (name: string) => { value: string } | undefined,
): boolean {
  const v = get(AUTH_JWT_COOKIE)?.value;
  return Boolean(v && v.length > 0);
}

/**
 * Only the backend JWT counts as authenticated.
 * Do **not** treat legacy `auth_session` as logged-in — it caused redirect loops with `/stores`
 * (middleware sent users to stores, API had no JWT, page sent them back to login).
 */
export function isAuthenticated(request: NextRequest): boolean {
  const get = (name: string) => request.cookies.get(name);
  return hasJwt(get);
}

/** For Server Components / `cookies()` from `next/headers`. */
export function isAuthenticatedFromCookies(cookieStore: {
  get: (name: string) => { value: string } | undefined;
}): boolean {
  const get = (name: string) => cookieStore.get(name);
  return hasJwt(get);
}

/** Routes that require auth (app shell): stores, mapping, suppliers, settings. */
export function isProtectedAppPath(pathname: string, locale: Locale): boolean {
  const roots = [
    `/${locale}/stores`,
    `/${locale}/mapping`,
    `/${locale}/suppliers`,
    `/${locale}/settings`,
    `/${locale}/dashboard`,
  ];
  return roots.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function isLoginPath(pathname: string, locale: Locale): boolean {
  return (
    pathname === `/${locale}/login` ||
    pathname.startsWith(`/${locale}/login/`)
  );
}

/** `/he`, `/he/`, etc. — not `/he/login` or protected paths. */
export function isLocaleRootPath(pathname: string, locale: Locale): boolean {
  return pathname === `/${locale}` || pathname === `/${locale}/`;
}

export function jwtCookieOptions(): {
  httpOnly: true;
  sameSite: "lax";
  path: string;
  maxAge: number;
  secure: boolean;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
    secure: process.env.NODE_ENV === "production",
  };
}

/** Legacy — kept for any code still referencing it */
export function authSessionCookieOptions(): {
  httpOnly: true;
  sameSite: "lax";
  path: string;
  maxAge: number;
  secure: boolean;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  };
}
