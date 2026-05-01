import { cookies } from "next/headers";
import { AUTH_JWT_COOKIE } from "@/lib/auth-session";

/** Matches backend `StoreSummary` from `GET /stores`. */
type StoreRow = {
  id: number;
  name: string;
  url: string;
  port?: number | null;
  productCount?: number;
  categoryCount?: number;
  lastSyncedAt?: string | null;
};

export type StoreCardData = {
  id: string;
  name: string;
  url: string;
  /** When unknown from API, shown as "—" */
  products: number | null;
  categories: number | null;
  /** ISO string or null */
  lastSynced: string | null;
  synced: boolean;
  logoUrl: string | null;
};

type ApiListResponse = {
  data?: StoreRow[];
  message?: string;
};

/**
 * Server-only: loads stores for the current user using the HttpOnly JWT cookie.
 */
export async function fetchStoresForUser(): Promise<
  { ok: true; stores: StoreCardData[] } | { ok: false; status: number }
> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!base) {
    return { ok: false, status: 500 };
  }

  const jar = await cookies();
  const token = jar.get(AUTH_JWT_COOKIE)?.value;
  if (!token) {
    return { ok: false, status: 401 };
  }

  const res = await fetch(`${base}/stores`, {
    headers: { Cookie: `${AUTH_JWT_COOKIE}=${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return { ok: false, status: res.status };
  }

  const json = (await res.json()) as ApiListResponse;
  const rows = json.data ?? [];

  const stores: Omit<StoreCardData, "logoUrl">[] = rows.map((s) => ({
    id: String(s.id),
    name: s.name,
    url: s.url,
    products: typeof s.productCount === "number" ? s.productCount : null,
    categories: typeof s.categoryCount === "number" ? s.categoryCount : null,
    lastSynced: typeof s.lastSyncedAt === "string" ? s.lastSyncedAt : null,
    synced: true,
  }));

  const logos = await Promise.all(
    stores.map(async (s) => {
      try {
        const r = await fetch(`${base}/stores/${s.id}/logo`, {
          headers: { Cookie: `${AUTH_JWT_COOKIE}=${token}` },
          cache: "no-store",
        });
        if (!r.ok) return null;
        const j = (await r.json()) as { data?: { logoUrl?: string | null } };
        return j.data?.logoUrl ?? null;
      } catch {
        return null;
      }
    }),
  );

  return {
    ok: true,
    stores: stores.map((s, i) => ({ ...s, logoUrl: logos[i] ?? null })),
  };
}
