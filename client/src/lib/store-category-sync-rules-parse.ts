import type { AppMessages } from "@/messages/app";

export type StoreCategorySyncRuleRef = {
  id: number;
  type: "product" | "category";
  enabled: boolean;
  supplierId: number;
  supplierName: string;
  supplierCategoryId?: number;
  supplierCategoryName?: string | null;
  sourceProductId?: number;
  sourceProductName?: string | null;
  markupPercent?: number | null;
  pricingMode?: "percent" | "fixed_amount" | null;
  fixedAmount?: number | null;
  useSalePrices?: boolean;
};

export function parseStoreCategorySyncRules(
  row: Record<string, unknown>,
): StoreCategorySyncRuleRef[] {
  const raw = row.syncRules;
  if (!Array.isArray(raw)) return [];

  const rules: StoreCategorySyncRuleRef[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const id = Number(o.id);
    const supplierId = Number(o.supplierId);
    const supplierName =
      typeof o.supplierName === "string" ? o.supplierName.trim() : "";
    const type =
      o.type === "product" || o.type === "category" ? o.type : null;
    if (!Number.isFinite(id) || !Number.isFinite(supplierId) || !type || !supplierName) {
      continue;
    }

    const supplierCategoryId = Number(o.supplierCategoryId);
    const sourceProductId = Number(o.sourceProductId);
    const markupRaw = o.markupPercent;
    const markupPercent =
      markupRaw !== null &&
      markupRaw !== undefined &&
      Number.isFinite(Number(markupRaw))
        ? Number(markupRaw)
        : null;
    const pricingMode =
      o.pricingMode === "fixed_amount" ? "fixed_amount" : "percent";
    const fixedAmountRaw = o.fixedAmount;
    const fixedAmount =
      fixedAmountRaw !== null &&
      fixedAmountRaw !== undefined &&
      Number.isFinite(Number(fixedAmountRaw))
        ? Number(fixedAmountRaw)
        : null;

    rules.push({
      id,
      type,
      enabled: o.enabled !== false,
      supplierId,
      supplierName,
      ...(Number.isFinite(supplierCategoryId)
        ? {
            supplierCategoryId,
            supplierCategoryName:
              typeof o.supplierCategoryName === "string"
                ? o.supplierCategoryName.trim() || null
                : null,
          }
        : {}),
      ...(Number.isFinite(sourceProductId)
        ? {
            sourceProductId,
            sourceProductName:
              typeof o.sourceProductName === "string"
                ? o.sourceProductName.trim() || null
                : null,
          }
        : {}),
      ...(markupPercent !== null ? { markupPercent } : {}),
      ...(pricingMode ? { pricingMode } : {}),
      ...(fixedAmount !== null ? { fixedAmount } : {}),
      ...(typeof o.useSalePrices === "boolean"
        ? { useSalePrices: o.useSalePrices }
        : {}),
    });
  }
  return rules;
}
