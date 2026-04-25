import { backendFetch } from "@/lib/backend-fetch";

export type SupplierEditData = {
  id: number;
  name: string;
  url: string;
};

export async function fetchSupplierForEdit(
  supplierId: string,
): Promise<
  { ok: true; data: SupplierEditData } | { ok: false; status: number }
> {
  let res: Response;
  try {
    res = await backendFetch(`/suppliers/${supplierId}`);
  } catch {
    return { ok: false, status: 401 };
  }
  if (!res.ok) {
    return { ok: false, status: res.status };
  }

  const json = (await res.json()) as {
    data: { id: number; name: string; url: string };
  };
  const d = json.data;
  return {
    ok: true,
    data: { id: d.id, name: d.name, url: d.url },
  };
}
