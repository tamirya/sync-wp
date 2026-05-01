export interface Store {
  id: number;
  userId: number;
  name: string;
  url: string;
  port: number | null;
  logoUrl: string | null;
}

/** `GET /stores` — includes catalog aggregates. */
export interface StoreSummary {
  id: number;
  userId: number;
  name: string;
  url: string;
  port: number | null;
  logoUrl: string | null;
  productCount: number;
  categoryCount: number;
  /** Latest `updatedAt` from `store_catalog` / `store_categories` for this store (ISO). */
  lastSyncedAt: string | null;
}

/** WooCommerce REST `products/categories` row (subset used by this API). */
export interface StoreProductCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count?: number;
}

/** WooCommerce REST `products` row (pass-through; full shape is WC v3 product). */
export type StoreWooProduct = Record<string, unknown>;
