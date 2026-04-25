const base = () =>
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

export type ApiErrorBody = { message?: string };

/** Same-origin login: sets HttpOnly `Authorization` (JWT) for API + middleware (see `/api/auth/login`). */
export async function apiLogin(email: string, password: string): Promise<Response> {
  return fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

/** Best-effort backend session invalidation (cookies are on the API host). */
export async function apiBackendLogout(): Promise<Response> {
  const url = `${base()}/logout`;
  return fetch(url, {
    method: "POST",
    credentials: "include",
  });
}
