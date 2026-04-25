import { NextResponse } from "next/server";
import {
  AUTH_JWT_COOKIE,
  AUTH_SESSION_COOKIE,
} from "@/lib/auth-session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_JWT_COOKIE);
  res.cookies.delete(AUTH_SESSION_COOKIE);
  return res;
}
