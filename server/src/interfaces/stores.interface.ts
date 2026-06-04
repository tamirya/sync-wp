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
export interface StoreCategorySyncRuleRef {
  id: number;
  type: 'category' | 'product';
  enabled: boolean;
  supplierId: number;
  supplierName: string;
  /** Present for category rules — supplier-side Woo category id. */
  supplierCategoryId?: number;
  supplierCategoryName?: string | null;
  /** Present for product rules — supplier-side product id. */
  sourceProductId?: number;
  sourceProductName?: string | null;
  /** From `price_overrides` when configured for this rule target. */
  markupPercent?: number | null;
  pricingMode?: 'percent' | 'fixed_amount' | null;
  fixedAmount?: number | null;
  useSalePrices?: boolean;
}

export interface StoreProductCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count?: number;
  syncRules?: StoreCategorySyncRuleRef[];
}

export interface StoreProductSyncRuleRef {
  id: number;
  type: 'product' | 'category';
  enabled: boolean;
}

/** Supplier origin + pricing + mapping rules for a store product imported from a supplier. */
export interface StoreProductSyncSource {
  supplierId: number;
  supplierName: string;
  sourceProductId: number;
  /** Supplier regular price (major units, formatted). */
  regularPrice: string | null;
  /** Supplier sale price when on sale. */
  salePrice: string | null;
  /** Current price shown on the supplier site (includes promotions). */
  displayPrice: string | null;
  onSale: boolean;
  rules: StoreProductSyncRuleRef[];
}

/** WooCommerce REST `products` row (pass-through; full shape is WC v3 product). */
export type StoreWooProduct = Record<string, unknown> & {
  syncSource?: StoreProductSyncSource;
};
