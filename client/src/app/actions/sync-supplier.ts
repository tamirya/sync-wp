"use server";

import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/backend-fetch";

export type SyncResult =
  | { ok: true; jobId: string }
  | { ok: false; message: string };

async function readApiError(res: Response): Promise<string> {
  const t = await res.text();
  try {
    const j = JSON.parse(t) as { message?: string };
    return j.message ?? (t || res.statusText);
  } catch {
    return t || res.statusText;
  }
}

export async function syncSupplierProductsAction(
  locale: string,
  supplierId: string,
): Promise<SyncResult> {
  try {
    const res = await backendFetch(`/suppliers/${supplierId}/catalog/sync`, {
      method: "POST",
    });
    if (!res.ok) {
      return { ok: false, message: await readApiError(res) };
    }
    const json = (await res.json()) as { data?: { jobId?: string } };
    const jobId = json.data?.jobId;
    if (!jobId) {
      return { ok: false, message: "No jobId returned from server" };
    }
    revalidatePath(`/${locale}/suppliers`);
    return { ok: true, jobId };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error" };
  }
}

export async function syncSupplierCategoriesAction(
  locale: string,
  supplierId: string,
): Promise<SyncResult> {
  try {
    const res = await backendFetch(`/suppliers/${supplierId}/categories/sync`, {
      method: "POST",
    });
    if (!res.ok) {
      return { ok: false, message: await readApiError(res) };
    }
    const json = (await res.json()) as { data?: { jobId?: string } };
    const jobId = json.data?.jobId;
    if (!jobId) {
      return { ok: false, message: "No jobId returned from server" };
    }
    revalidatePath(`/${locale}/suppliers`);
    return { ok: true, jobId };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error" };
  }
}
