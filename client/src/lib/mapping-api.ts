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
  /** True when the price has been overridden via price_overrides. */
  isOverridden?: boolean;
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
  /** Embedded product info from the backend response (when available). */
  embeddedProduct?: { name?: string; sku?: string } | null;
};

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Backend may return `{ data: [] }`, `{ data: { products: [] } }`, `{ products: [] }`, or other keys. */
function productArrayFromJson(json: Record<string, unknown> | null): unknown[] {
  if (!json) {
    return [];
  }
  // Handle paginated response shape: { data: { products: [], total, page, ... } }
  const data = json["data"];
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const nested = data as Record<string, unknown>;
    if (Array.isArray(nested["products"])) {
      return nested["products"];
    }
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
    const PER_PAGE = 500;
    const allProducts: ReturnType<typeof parseProductsFromApi> = [];

    // Fetch the first page to discover totalPages.
    const firstRes = await backendFetch(
      `/suppliers/${supplierId}/products?perPage=${PER_PAGE}&page=1`,
    );
    if (!firstRes.ok) return { ok: false, status: firstRes.status };

    const firstJson = await readJson<Record<string, unknown>>(firstRes);
    allProducts.push(...parseProductsFromApi(productArrayFromJson(firstJson)));

    // Try to read pagination metadata from the { data: { totalPages } } shape.
    const dataBlock =
      firstJson?.["data"] &&
      typeof firstJson["data"] === "object" &&
      !Array.isArray(firstJson["data"])
        ? (firstJson["data"] as Record<string, unknown>)
        : null;
    const totalPages =
      typeof dataBlock?.["totalPages"] === "number"
        ? dataBlock["totalPages"]
        : 1;

    // Fetch remaining pages in parallel (cap at 20 pages = 10 000 products).
    if (totalPages > 1) {
      const pageNumbers = Array.from(
        { length: Math.min(totalPages - 1, 19) },
        (_, i) => i + 2,
      );
      const restResults = await Promise.all(
        pageNumbers.map(async (page) => {
          const res = await backendFetch(
            `/suppliers/${supplierId}/products?perPage=${PER_PAGE}&page=${page}`,
          );
          if (!res.ok) return [];
          const json = await readJson<Record<string, unknown>>(res);
          return parseProductsFromApi(productArrayFromJson(json));
        }),
      );
      for (const batch of restResults) allProducts.push(...batch);
    }

    return { ok: true, products: allProducts };
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
      const productRaw =
        obj.product && typeof obj.product === "object"
          ? (obj.product as Record<string, unknown>)
          : obj.sourceProduct && typeof obj.sourceProduct === "object"
            ? (obj.sourceProduct as Record<string, unknown>)
            : null;
      const embeddedProduct = productRaw
        ? {
            name:
              typeof productRaw.name === "string" ? productRaw.name : undefined,
            sku:
              typeof productRaw.sku === "string" ? productRaw.sku : undefined,
          }
        : null;
      return {
        id: Number(obj.id),
        storeId: Number(obj.storeId),
        supplierId: Number(obj.supplierId),
        sourceProductId: Number(obj.sourceProductId),
        storeCategoryId: Number(obj.storeCategoryId),
        enabled: Boolean(obj.enabled),
        createdAt: strOrNull(obj.createdAt),
        updatedAt: strOrNull(obj.updatedAt),
        embeddedProduct,
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
