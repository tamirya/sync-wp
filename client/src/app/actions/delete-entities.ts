"use server";

import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/backend-fetch";

export type DeleteEntityResult =
  | { ok: true }
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

export async function deleteStoreAction(
  locale: string,
  storeId: string,
): Promise<DeleteEntityResult> {
  try {
    const res = await backendFetch(`/stores/${storeId}`, { method: "DELETE" });
    if (!res.ok) {
      return { ok: false, message: await readApiError(res) };
    }
    revalidatePath(`/${locale}/stores`);
    return { ok: true };
  } catch {
    return { ok: false, message: "Unauthorized or server misconfigured" };
  }
}

export async function deleteSupplierAction(
  locale: string,
  supplierId: string,
): Promise<DeleteEntityResult> {
  try {
    const res = await backendFetch(`/suppliers/${supplierId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      return { ok: false, message: await readApiError(res) };
    }
    revalidatePath(`/${locale}/suppliers`);
    return { ok: true };
  } catch {
    return { ok: false, message: "Unauthorized or server misconfigured" };
  }
}
