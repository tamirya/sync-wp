export interface Supplier {
  id: number;
  userId: number;
  name: string;
  url: string;
  logoUrl: string | null;
}

/** `GET /suppliers` — aggregates from `supplier_catalog` / `supplier_categories`. */
export interface SupplierSummary {
  id: number;
  userId: number;
  name: string;
  url: string;
  logoUrl: string | null;
  productCount: number;
  categoryCount: number;
  /** Latest `updatedAt` from catalog/category tables for this supplier (ISO). */
  lastSyncedAt: string | null;
}
