import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_JWT_COOKIE } from "@/lib/auth-session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!base) {
    return NextResponse.json({ message: "Server misconfigured" }, { status: 500 });
  }

  const jar = await cookies();
  const token = jar.get(AUTH_JWT_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(`${base}/stores/${id}/categories`, {
    headers: { Cookie: `${AUTH_JWT_COOKIE}=${token}` },
    cache: "no-store",
  });

  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
