"use server";

import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/backend-fetch";

export type SyncResult = { ok: true } | { ok: false; message: string };

async function readApiError(res: Response): Promise<string> {
  const t = await res.text();
  try {
    const j = JSON.parse(t) as { message?: string };
    return j.message ?? (t || res.statusText);
  } catch {
    return t || res.statusText;
  }
}

export async function syncStoreProductsAction(
  locale: string,
  storeId: string,
): Promise<SyncResult> {
  try {
    const res = await backendFetch(`/stores/${storeId}/catalog/sync`, {
      method: "POST",
    });
    if (!res.ok) {
      return { ok: false, message: await readApiError(res) };
    }
    revalidatePath(`/${locale}/stores`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error" };
  }
}

export async function syncStoreCategoriesAction(
  locale: string,
  storeId: string,
): Promise<SyncResult> {
  try {
    const res = await backendFetch(`/stores/${storeId}/categories/sync`, {
      method: "POST",
    });
    if (!res.ok) {
      return { ok: false, message: await readApiError(res) };
    }
    revalidatePath(`/${locale}/stores`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error" };
  }
}

export async function clearStoreWooProductsAction(
  locale: string,
  storeId: string,
): Promise<SyncResult> {
  try {
    const res = await backendFetch(`/stores/${storeId}/products/clear-woo`, {
      method: "POST",
      body: JSON.stringify({ confirm: true }),
    });
    if (!res.ok) {
      return { ok: false, message: await readApiError(res) };
    }
    revalidatePath(`/${locale}/stores`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error" };
  }
}

export async function clearStoreWooCategoriesAction(
  locale: string,
  storeId: string,
): Promise<SyncResult> {
  try {
    const res = await backendFetch(`/stores/${storeId}/categories/clear`, {
      method: "POST",
      body: JSON.stringify({ confirm: true }),
    });
    if (!res.ok) {
      return { ok: false, message: await readApiError(res) };
    }
    revalidatePath(`/${locale}/stores`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error" };
  }
}
