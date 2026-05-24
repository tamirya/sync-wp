import { cookies } from "next/headers";
import { AUTH_JWT_COOKIE } from "@/lib/auth-session";

type JobRow = {
  id: string;
  type: string;
  entityId: number;
  status: string;
};

type JobsListResponse = {
  data?: JobRow[];
};

/** supplierId (as string) → active jobIds[] */
export type ActiveSupplierJobsMap = Record<string, string[]>;

const SUPPLIER_JOB_TYPES = new Set([
  "supplier_categories",
  "supplier_catalog",
  "supplier_scraper",
]);

export async function fetchActiveSupplierJobsMap(): Promise<ActiveSupplierJobsMap> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!base) return {};

  const jar = await cookies();
  const token = jar.get(AUTH_JWT_COOKIE)?.value;
  if (!token) return {};

  try {
    const res = await fetch(`${base}/jobs`, {
      headers: { Cookie: `${AUTH_JWT_COOKIE}=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return {};

    const json = (await res.json()) as JobsListResponse;
    const rows = json.data ?? [];

    const map: ActiveSupplierJobsMap = {};
    for (const row of rows) {
      if (!SUPPLIER_JOB_TYPES.has(row.type)) continue;
      if (row.status !== "pending" && row.status !== "running") continue;
      const key = String(row.entityId);
      if (!map[key]) map[key] = [];
      map[key].push(row.id);
    }
    return map;
  } catch {
    return {};
  }
}
