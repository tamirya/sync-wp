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

  const suppliers: SupplierCardData[] = rows.map((s) => ({
    id: String(s.id),
    name: s.name,
    url: s.url,
    products:
      typeof s.productCount === "number" ? s.productCount : null,
    categories:
      typeof s.categoryCount === "number" ? s.categoryCount : null,
    lastSynced:
      typeof s.lastSyncedAt === "string" ? s.lastSyncedAt : null,
    synced: true,
  }));

  return { ok: true, suppliers };
}
