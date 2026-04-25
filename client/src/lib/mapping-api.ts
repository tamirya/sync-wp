import { backendFetch } from "@/lib/backend-fetch";
import type { MappingCategoryFlat } from "@/lib/mapping-tree-utils";
import { parseProductsFromApi } from "@/lib/mapping-tree-utils";

/** Matches backend `CategoryRule` from `GET /category-rules`. */
export type MappingRule = {
  id: number;
  storeId: number;
  supplierId: number;
  supplierCategoryId: number;
  storeCategoryId: number;
  enabled: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

/** Enriched supplier product info used for display in the rules list. */
export type SupplierProductInfo = {
  name: string;
  sku: string;
  price: string | null;
};

/** Matches backend `ProductCategoryRule` from `GET /product-category-rules`. */
export type ProductMappingRule = {
  id: number;
  storeId: number;
  supplierId: number;
  /** Supplier-side product id */
  sourceProductId: number;
  storeCategoryId: number;
  enabled: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Backend may return `{ data: [] }`, `{ products: [] }`, or other keys. */
function productArrayFromJson(json: Record<string, unknown> | null): unknown[] {
  if (!json) {
    return [];
  }
  for (const key of [
    "data",
    "products",
    "items",
    "rows",
    "catalog",
    "results",
  ] as const) {
    const v = json[key];
    if (Array.isArray(v)) {
      return v;
    }
  }
  return [];
}

export async function fetchStoreCategoriesForMapping(
  storeId: string,
): Promise<
  | { ok: true; categories: MappingCategoryFlat[] }
  | { ok: false; status: number }
> {
  try {
    const res = await backendFetch(`/stores/${storeId}/categories`);
    if (!res.ok) {
      return { ok: false, status: res.status };
    }
    const json = await readJson<{ data?: MappingCategoryFlat[] }>(res);
    const rows = json?.data ?? [];
    return { ok: true, categories: rows };
  } catch {
    return { ok: false, status: 401 };
  }
}

export async function fetchStoreProductsForMapping(
  storeId: string,
): Promise<
  | { ok: true; products: ReturnType<typeof parseProductsFromApi> }
  | { ok: false; status: number }
> {
  try {
    const res = await backendFetch(`/stores/${storeId}/products`);
    if (!res.ok) {
      return { ok: false, status: res.status };
    }
    const json = await readJson<Record<string, unknown>>(res);
    const products = parseProductsFromApi(productArrayFromJson(json));
    return { ok: true, products };
  } catch {
    return { ok: false, status: 401 };
  }
}

export async function fetchSupplierCategoriesForMapping(
  supplierId: string,
): Promise<
  | { ok: true; categories: MappingCategoryFlat[] }
  | { ok: false; status: number }
> {
  try {
    const res = await backendFetch(`/suppliers/${supplierId}/categories`);
    if (!res.ok) {
      return { ok: false, status: res.status };
    }
    const json = await readJson<{ data?: MappingCategoryFlat[] }>(res);
    const rows = json?.data ?? [];
    return { ok: true, categories: rows };
  } catch {
    return { ok: false, status: 401 };
  }
}

export async function fetchSupplierProductsForMapping(
  supplierId: string,
): Promise<
  | { ok: true; products: ReturnType<typeof parseProductsFromApi> }
  | { ok: false; status: number }
> {
  try {
    const res = await backendFetch(`/suppliers/${supplierId}/products`);
    if (!res.ok) {
      return { ok: false, status: res.status };
    }
    const json = await readJson<Record<string, unknown>>(res);
    const products = parseProductsFromApi(productArrayFromJson(json));
    return { ok: true, products };
  } catch {
    return { ok: false, status: 401 };
  }
}

function strOrNull(v: unknown): string | null {
  return v != null && v !== "" ? String(v) : null;
}

export async function fetchMappingRules(): Promise<
  | { ok: true; rules: MappingRule[] }
  | { ok: false; status: number }
> {
  try {
    const res = await backendFetch("/category-rules", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      if (res.status === 404) {
        return { ok: true, rules: [] };
      }
      return { ok: false, status: res.status };
    }
    const json = await readJson<{ data?: unknown[] }>(res);
    const rawRules = Array.isArray(json?.data) ? json.data : [];

    const rules: MappingRule[] = rawRules.map((r) => {
      const obj = r as Record<string, unknown>;
      return {
        id: Number(obj.id),
        storeId: Number(obj.storeId),
        supplierId: Number(obj.supplierId),
        supplierCategoryId: Number(obj.supplierCategoryId),
        storeCategoryId: Number(obj.storeCategoryId),
        enabled: Boolean(obj.enabled),
        createdAt: strOrNull(obj.createdAt),
        updatedAt: strOrNull(obj.updatedAt),
      };
    });

    return { ok: true, rules };
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError");
    if (isTimeout) {
      return { ok: true, rules: [] };
    }
    return { ok: false, status: 500 };
  }
}

export async function fetchProductMappingRules(): Promise<
  | { ok: true; rules: ProductMappingRule[] }
  | { ok: false; status: number }
> {
  try {
    const res = await backendFetch("/product-category-rules", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      if (res.status === 404) {
        return { ok: true, rules: [] };
      }
      return { ok: false, status: res.status };
    }
    const json = await readJson<{ data?: unknown[] }>(res);
    const rawRules = Array.isArray(json?.data) ? json.data : [];

    const rules: ProductMappingRule[] = rawRules.map((r) => {
      const obj = r as Record<string, unknown>;
      return {
        id: Number(obj.id),
        storeId: Number(obj.storeId),
        supplierId: Number(obj.supplierId),
        sourceProductId: Number(obj.sourceProductId),
        storeCategoryId: Number(obj.storeCategoryId),
        enabled: Boolean(obj.enabled),
        createdAt: strOrNull(obj.createdAt),
        updatedAt: strOrNull(obj.updatedAt),
      };
    });

    return { ok: true, rules };
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError");
    if (isTimeout) {
      return { ok: true, rules: [] };
    }
    return { ok: false, status: 500 };
  }
}
