import { NextResponse } from "next/server";
import {
  AUTH_JWT_COOKIE,
  jwtCookieOptions,
} from "@/lib/auth-session";

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
}

/** Parse `Authorization=<jwt>` from backend Set-Cookie header(s). */
function extractAuthorizationTokenFromResponse(res: Response): string | null {
  const headers = res.headers;
  const lines: string[] =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [];
  if (lines.length === 0) {
    const combined = headers.get("set-cookie");
    if (combined) {
      lines.push(...combined.split(/,(?=[^;]+?=)/));
    }
  }
  for (const line of lines) {
    const m = /^Authorization=([^;]+)/.exec(line.trim());
    if (m?.[1]) {
      return m[1].trim();
    }
  }
  return null;
}

export async function POST(request: Request) {
  const base = apiBase();
  if (!base) {
    return NextResponse.json({ message: "Server misconfigured" }, { status: 500 });
  }

  const body = await request.json();
  const res = await fetch(`${base}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const contentType =
    res.headers.get("content-type") ?? "application/json; charset=utf-8";

  if (!res.ok) {
    return new Response(text, { status: res.status, headers: { "Content-Type": contentType } });
  }

  let payload: unknown = {};
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = { message: text };
    }
  }

  const out = NextResponse.json(payload);
  const token = extractAuthorizationTokenFromResponse(res);
  if (token) {
    out.cookies.set(AUTH_JWT_COOKIE, token, jwtCookieOptions());
  }
  return out;
}
