import Link from "next/link";
import type { AppMessages } from "@/messages/app";

export type StoreProductSyncRuleRef = {
  id: number;
  type: "product" | "category";
  enabled: boolean;
};

export type StoreProductSyncSource = {
  supplierId: number;
  supplierName: string;
  sourceProductId: number;
  regularPrice: string | null;
  salePrice: string | null;
  displayPrice: string | null;
  onSale: boolean;
  rules: StoreProductSyncRuleRef[];
};

export function parseStoreProductSyncSource(
  row: Record<string, unknown>,
): StoreProductSyncSource | null {
  const raw = row.syncSource;
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;

  const supplierId = Number(s.supplierId);
  const sourceProductId = Number(s.sourceProductId);
  const supplierName = typeof s.supplierName === "string" ? s.supplierName.trim() : "";
  if (!Number.isFinite(supplierId) || !Number.isFinite(sourceProductId) || !supplierName) {
    return null;
  }

  const strOrNull = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  const rules: StoreProductSyncRuleRef[] = [];
  if (Array.isArray(s.rules)) {
    for (const r of s.rules) {
      if (!r || typeof r !== "object") continue;
      const o = r as Record<string, unknown>;
      const id = Number(o.id);
      if (!Number.isFinite(id)) continue;
      const type = o.type === "product" || o.type === "category" ? o.type : null;
      if (!type) continue;
      rules.push({ id, type, enabled: o.enabled !== false });
    }
  }

  return {
    supplierId,
    supplierName,
    sourceProductId,
    regularPrice: strOrNull(s.regularPrice),
    salePrice: strOrNull(s.salePrice),
    displayPrice: strOrNull(s.displayPrice),
    onSale: s.onSale === true,
    rules,
  };
}

type Props = {
  syncSource: StoreProductSyncSource;
  locale: string;
  messages: AppMessages;
};

export function StoreProductSyncInfo({ syncSource, locale, messages }: Props) {
  const hasSale =
    syncSource.onSale &&
    syncSource.salePrice !== null &&
    syncSource.regularPrice !== null &&
    syncSource.salePrice !== syncSource.regularPrice;

  const displayPrice =
    syncSource.displayPrice ??
    (hasSale ? syncSource.salePrice : syncSource.regularPrice);

  return (
    <div className="rounded-xl border border-border/60 bg-muted-bg/50 px-3 py-2.5 text-xs">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span className="font-medium text-muted">{messages.storeProductSyncedFrom}</span>
        <Link
          href={`/${locale}/suppliers/${syncSource.supplierId}`}
          className="font-semibold text-primary hover:underline"
        >
          {syncSource.supplierName}
        </Link>
      </div>

      {displayPrice && (
        <div className="mt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            {messages.storeProductSupplierPrice}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {hasSale ? (
              <>
                <span className="font-bold text-emerald-700">
                  {syncSource.salePrice} ש״ח
                </span>
                <span className="text-muted line-through">
                  {syncSource.regularPrice} ש״ח
                </span>
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  {messages.storeProductSalePrice}
                </span>
              </>
            ) : (
              <span className="font-bold text-foreground">{displayPrice} ש״ח</span>
            )}
          </div>
        </div>
      )}

      {syncSource.rules.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {syncSource.rules.map((rule) => {
            const label =
              rule.type === "product"
                ? messages.storeProductSyncRuleProduct
                : messages.storeProductSyncRuleCategory;
            return (
              <span
                key={`${rule.type}-${rule.id}`}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                  rule.enabled
                    ? "bg-primary/10 text-primary ring-primary/20"
                    : "bg-muted-bg text-muted ring-border/60"
                }`}
                title={
                  rule.enabled
                    ? messages.storeProductSyncRuleActive
                    : messages.storeProductSyncRuleDisabled
                }
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-3 w-3 shrink-0"
                  aria-hidden
                >
                  <path
                    d="M8 1.5l1.2 2.4 2.7.4-2 1.9.5 2.7L8 7.8 5.6 8.9l.5-2.7-2-1.9 2.7-.4L8 1.5z"
                    strokeLinejoin="round"
                  />
                </svg>
                {label}
                {!rule.enabled ? ` (${messages.storeProductSyncRuleDisabledShort})` : ""}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
