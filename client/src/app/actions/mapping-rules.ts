"use server";

import { backendFetch } from "@/lib/backend-fetch";
import { revalidatePath } from "next/cache";

export type MappingActionResult = { ok: true } | { ok: false; error: string };

export async function syncMappingRulesAction(
  locale: string,
  storeIds: number[],
): Promise<MappingActionResult> {
  try {
    for (const storeId of storeIds) {
      const res = await backendFetch(`/stores/${storeId}/import/sync-rules`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        return { ok: false, error: await readApiError(res) };
      }
    }
    revalidatePath(`/${locale}/mapping`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function readApiError(res: Response): Promise<string> {
  const t = await res.text().catch(() => "");
  try {
    const j = JSON.parse(t) as { message?: string };
    return j.message ?? (t || res.statusText);
  } catch {
    return t || res.statusText;
  }
}

export async function createCategoryRulesAction(
  locale: string,
  rules: Array<{
    storeId: number;
    supplierId: number;
    supplierCategoryId: number;
    storeCategoryId: number;
  }>,
): Promise<MappingActionResult> {
  try {
    for (const rule of rules) {
      const res = await backendFetch("/category-rules", {
        method: "POST",
        body: JSON.stringify(rule),
      });
      if (!res.ok) {
        return { ok: false, error: await readApiError(res) };
      }
    }
    revalidatePath(`/${locale}/mapping`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function updateCategoryRuleEnabledAction(
  locale: string,
  ruleId: number,
  enabled: boolean,
): Promise<MappingActionResult> {
  try {
    const res = await backendFetch(`/category-rules/${ruleId}`, {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) {
      return { ok: false, error: await readApiError(res) };
    }
    revalidatePath(`/${locale}/mapping`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function updateProductRuleEnabledAction(
  locale: string,
  ruleId: number,
  enabled: boolean,
): Promise<MappingActionResult> {
  try {
    const res = await backendFetch(`/product-category-rules/${ruleId}`, {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) {
      return { ok: false, error: await readApiError(res) };
    }
    revalidatePath(`/${locale}/mapping`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function deleteCategoryRuleAction(
  locale: string,
  ruleId: number,
): Promise<MappingActionResult> {
  try {
    const res = await backendFetch(`/category-rules/${ruleId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      return { ok: false, error: await readApiError(res) };
    }
    revalidatePath(`/${locale}/mapping`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function deleteProductRuleAction(
  locale: string,
  ruleId: number,
): Promise<MappingActionResult> {
  try {
    const res = await backendFetch(`/product-category-rules/${ruleId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      return { ok: false, error: await readApiError(res) };
    }
    revalidatePath(`/${locale}/mapping`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function createProductRulesAction(
  locale: string,
  rules: Array<{
    storeId: number;
    supplierId: number;
    sourceProductId: number;
    storeCategoryId: number;
  }>,
): Promise<MappingActionResult> {
  try {
    for (const rule of rules) {
      const res = await backendFetch("/product-category-rules", {
        method: "POST",
        body: JSON.stringify(rule),
      });
      if (!res.ok) {
        return { ok: false, error: await readApiError(res) };
      }
    }
    revalidatePath(`/${locale}/mapping`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
