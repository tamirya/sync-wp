import { cookies } from "next/headers";
import { AUTH_JWT_COOKIE } from "@/lib/auth-session";

type SupplierRow = {
  id: number;
  name: string;
  url: string;
  productCount?: number;
  categoryCount?: number;
  lastSyncedAt?: string | null;
};

export type SupplierCardData = {
  id: string;
  name: string;
  url: string;
  products: number | null;
  categories: number | null;
  lastSynced: string | null;
  synced: boolean;
  logoUrl: string | null;
};

type ApiListResponse = {
  data?: SupplierRow[];
  message?: string;
};

export async function fetchSuppliersForUser(): Promise<
  { ok: true; suppliers: SupplierCardData[] } | { ok: false; status: number }
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

  const res = await fetch(`${base}/suppliers`, {
    headers: { Cookie: `${AUTH_JWT_COOKIE}=${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return { ok: false, status: res.status };
  }

  const json = (await res.json()) as ApiListResponse;
  const rows = json.data ?? [];

  const suppliers: Omit<SupplierCardData, "logoUrl">[] = rows.map((s) => ({
    id: String(s.id),
    name: s.name,
    url: s.url,
    products: typeof s.productCount === "number" ? s.productCount : null,
    categories: typeof s.categoryCount === "number" ? s.categoryCount : null,
    lastSynced: typeof s.lastSyncedAt === "string" ? s.lastSyncedAt : null,
    synced: true,
  }));

  const logos = await Promise.all(
    suppliers.map(async (s) => {
      try {
        const r = await fetch(`${base}/suppliers/${s.id}/logo`, {
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
    suppliers: suppliers.map((s, i) => ({ ...s, logoUrl: logos[i] ?? null })),
  };
}
