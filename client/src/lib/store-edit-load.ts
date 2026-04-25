import { backendFetch } from "@/lib/backend-fetch";

export type StoreEditData = {
  id: number;
  name: string;
  url: string;
  port: number | null;
  consumerKey: string;
  consumerSecret: string;
  envRowId: number | null;
};

/**
 * Server-only: full store row + matching env credentials for the edit form.
 */
export async function fetchStoreEditData(
  storeId: string,
): Promise<
  { ok: true; data: StoreEditData } | { ok: false; status: number }
> {
  let storeRes: Response;
  try {
    storeRes = await backendFetch(`/stores/${storeId}`);
  } catch {
    return { ok: false, status: 401 };
  }
  if (!storeRes.ok) {
    return { ok: false, status: storeRes.status };
  }

  const sj = (await storeRes.json()) as {
    data: {
      id: number;
      name: string;
      url: string;
      port?: number | null;
    };
  };
  const s = sj.data;

  let envRowId: number | null = null;
  let consumerKey = "";
  let consumerSecret = "";

  let envRes: Response;
  try {
    envRes = await backendFetch("/env_to_store");
  } catch {
    return { ok: false, status: 401 };
  }
  if (envRes.ok) {
    const ej = (await envRes.json()) as {
      data?: Array<{
        id: number;
        storeId: number;
        consumerKey: string;
        consumerSecret: string;
      }>;
    };
    const row = ej.data?.find((e) => e.storeId === s.id);
    if (row) {
      envRowId = row.id;
      consumerKey = row.consumerKey;
      consumerSecret = row.consumerSecret;
    }
  }

  return {
    ok: true,
    data: {
      id: s.id,
      name: s.name,
      url: s.url,
      port: s.port ?? null,
      consumerKey,
      consumerSecret,
      envRowId,
    },
  };
}
