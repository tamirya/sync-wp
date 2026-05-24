"use server";

import { backendFetch } from "@/lib/backend-fetch";
import { formatWooStorePriceFromFields } from "@/lib/mapping-tree-utils";
import { parsePriceString, type ProductPriceFields } from "@/lib/price-utils";

export type FetchCategoryProductsForPricingResult =
  | { ok: true; products: ProductPriceFields[] }
  | { ok: false; message: string };

/** Loads all products in a supplier category (for min supplier price in markup modal). */
export async function fetchCategoryProductsForPricingAction(
  supplierId: number,
  categoryId: number,
): Promise<FetchCategoryProductsForPricingResult> {
  try {
    const products: ProductPriceFields[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const params = new URLSearchParams({
        categoryId: String(categoryId),
        page: String(page),
        perPage: "100",
      });
      const res = await backendFetch(
        `/suppliers/${supplierId}/products?${params}`,
      );
      if (!res.ok) {
        return { ok: false, message: res.statusText };
      }
      const json = (await res.json()) as {
        data?: {
          products?: Record<string, unknown>[];
          totalPages?: number;
        };
      };
      const d = json.data ?? {};
      totalPages = d.totalPages ?? 1;

      for (const row of d.products ?? []) {
        const merged = row;
        let regularPrice: string | null = formatWooStorePriceFromFields(
          merged.prices,
          "regular_only",
        );
        let salePrice: string | null = null;
        if (merged.prices && typeof merged.prices === "object") {
          const p = merged.prices as Record<string, unknown>;
          if (p.sale_price != null && p.sale_price !== undefined) {
            salePrice = formatWooStorePriceFromFields(
              { ...p, price: p.sale_price },
              "sale_first",
            );
          }
        }
        if (!regularPrice && merged.regular_price != null) {
          regularPrice = String(merged.regular_price);
        }
        if (!salePrice && merged.sale_price != null) {
          salePrice = String(merged.sale_price);
        }

        let displayPrice: string | null = formatWooStorePriceFromFields(
          merged.prices,
          "sale_first",
        );
        if (!displayPrice && merged.price != null) {
          displayPrice = String(merged.price);
        }

        products.push({
          regularPrice: parsePriceString(regularPrice),
          salePrice: parsePriceString(salePrice),
          displayPrice: parsePriceString(displayPrice),
        });
      }
      page += 1;
    }

    return { ok: true, products };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
