import { cookies } from "next/headers";
import { AUTH_JWT_COOKIE } from "@/lib/auth-session";

/** Server-only fetch to the Express API with the user JWT cookie. */
export async function backendFetch(
  path: string,
  init: RequestInit = {},
  revalidate?: number,
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

  const cacheOptions: RequestInit =
    revalidate !== undefined
      ? { next: { revalidate } as NextFetchRequestConfig }
      : { cache: "no-store" };

  return fetch(url, {
    ...init,
    ...cacheOptions,
    headers,
  });
}

type NextFetchRequestConfig = { revalidate?: number | false; tags?: string[] };
