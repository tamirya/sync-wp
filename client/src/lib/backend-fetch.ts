import { cookies } from "next/headers";
import { AUTH_JWT_COOKIE } from "@/lib/auth-session";

/** Server-only fetch to the Express API with the user JWT cookie. */
export async function backendFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error("Missing NEXT_PUBLIC_API_URL");
  }

  const jar = await cookies();
  const token = jar.get(AUTH_JWT_COOKIE)?.value;
  if (!token) {
    throw new Error("Unauthorized");
  }

  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  if (
    init.body &&
    typeof init.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Cookie", `${AUTH_JWT_COOKIE}=${token}`);

  return fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });
}
