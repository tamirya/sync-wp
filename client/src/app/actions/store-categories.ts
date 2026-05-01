"use server";

import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/backend-fetch";

type ActionResult = { ok: true } | { ok: false; message: string };

async function readApiError(res: Response): Promise<string> {
  const t = await res.text();
  try {
    const j = JSON.parse(t) as { message?: string };
    return j.message ?? (t || res.statusText);
  } catch {
    return t || res.statusText;
  }
}

export async function createStoreCategoryAction(
  locale: string,
  storeId: string,
  body: { name: string; parent?: number; slug?: string },
): Promise<ActionResult> {
  try {
    const res = await backendFetch(`/stores/${storeId}/categories`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) return { ok: false, message: await readApiError(res) };
    revalidatePath(`/${locale}/stores/${storeId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error" };
  }
}

export async function updateStoreCategoryAction(
  locale: string,
  storeId: string,
  catId: number,
  body: { name?: string; parent?: number; slug?: string },
): Promise<ActionResult> {
  try {
    const res = await backendFetch(`/stores/${storeId}/categories/${catId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    if (!res.ok) return { ok: false, message: await readApiError(res) };
    revalidatePath(`/${locale}/stores/${storeId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error" };
  }
}

export async function deleteStoreCategoryAction(
  locale: string,
  storeId: string,
  catId: number,
): Promise<ActionResult> {
  try {
    const res = await backendFetch(`/stores/${storeId}/categories/${catId}`, {
      method: "DELETE",
    });
    if (!res.ok) return { ok: false, message: await readApiError(res) };
    revalidatePath(`/${locale}/stores/${storeId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Error" };
  }
}
