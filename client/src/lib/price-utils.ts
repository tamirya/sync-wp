export type ProductPriceFields = {
  regularPrice: number | null;
  salePrice: number | null;
  /** What the supplier site displays as the current price (`prices.price`). */
  displayPrice?: number | null;
};

export type PricingMode = "percent" | "fixed_amount";

export type PriceOverride = {
  pricingMode: PricingMode;
  markupPercent: number;
  fixedAmount: number;
  useSalePrices: boolean;
};

export const MARKUP_PERCENT_MIN = -100;
export const MARKUP_PERCENT_MAX = 1000;
export const FIXED_AMOUNT_MIN = -9999;
export const FIXED_AMOUNT_MAX = 9999;

export type PriceOverrideRaw = {
  pricingMode?: string;
  markupPercent?: number;
  fixedAmount?: number | null;
  useSalePrices?: boolean;
};

export function normalizePriceOverride(raw: PriceOverrideRaw): PriceOverride {
  return {
    pricingMode: raw.pricingMode === "fixed_amount" ? "fixed_amount" : "percent",
    markupPercent: Number(raw.markupPercent ?? 0),
    fixedAmount: raw.fixedAmount != null ? Number(raw.fixedAmount) : 0,
    useSalePrices: raw.useSalePrices === true,
  };
}

export function parsePriceString(
  str: string | null | undefined,
): number | null {
  if (!str) return null;
  const n = parseFloat(str.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function effectiveProductPrice(
  fields: ProductPriceFields,
  useSalePrices: boolean,
): number | null {
  if (useSalePrices) {
    if (fields.displayPrice != null && fields.displayPrice > 0) {
      return fields.displayPrice;
    }
  }

  const regular = fields.regularPrice;
  const sale = fields.salePrice;
  const hasSale =
    sale != null && regular != null && sale > 0 && sale < regular;

  if (useSalePrices && hasSale) return sale;
  if (regular != null && regular > 0) return regular;
  if (useSalePrices && sale != null && sale > 0) return sale;
  return null;
}

export function computeMinPrice(
  products: ProductPriceFields[],
  useSalePrices: boolean,
): number | null {
  let min: number | null = null;
  for (const p of products) {
    const price = effectiveProductPrice(p, useSalePrices);
    if (price == null || price <= 0) continue;
    if (min == null || price < min) min = price;
  }
  return min;
}

export function applyMarkup(base: number, markupPercent: number): number {
  return roundPrice(Math.max(0, base * (1 + markupPercent / 100)));
}

export function applyFixedAmount(base: number, fixedAmount: number): number {
  return roundPrice(Math.max(0, base + fixedAmount));
}

export function applyPriceOverride(base: number, override: PriceOverride): number {
  if (base <= 0) return 0;
  if (override.pricingMode === "fixed_amount") {
    return applyFixedAmount(base, override.fixedAmount);
  }
  return applyMarkup(base, override.markupPercent);
}

export function roundPrice(n: number): number {
  return Math.round(n * 100) / 100;
}

export function clampMarkupPercent(value: number): number {
  return roundPrice(
    Math.min(MARKUP_PERCENT_MAX, Math.max(MARKUP_PERCENT_MIN, value)),
  );
}

export function clampFixedAmount(value: number): number {
  return roundPrice(
    Math.min(FIXED_AMOUNT_MAX, Math.max(FIXED_AMOUNT_MIN, value)),
  );
}

export function formatMarkupLabel(markupPercent: number): string {
  const n = roundPrice(markupPercent);
  if (n === 0) return "0%";
  return n > 0 ? `+${n}%` : `${n}%`;
}

export function formatFixedAmountLabel(fixedAmount: number): string {
  const n = roundPrice(fixedAmount);
  if (n === 0) return "₪0";
  const abs = Math.abs(n).toFixed(2);
  return n > 0 ? `+₪${abs}` : `−₪${abs}`;
}

export function formatPriceOverrideLabel(override: PriceOverride): string {
  if (override.pricingMode === "fixed_amount") {
    return formatFixedAmountLabel(override.fixedAmount);
  }
  return formatMarkupLabel(override.markupPercent);
}

export function adjustMarkupPercent(current: number, delta: number): number {
  return clampMarkupPercent(current + delta);
}

export function adjustFixedAmount(current: number, delta: number): number {
  return clampFixedAmount(current + delta);
}

export function previewPriceWithMarkup(
  base: number | null,
  markupPercent: number,
): string | null {
  if (base == null || base <= 0) return null;
  return `₪${applyMarkup(base, markupPercent).toFixed(2)}`;
}

export function previewPriceWithFixedAmount(
  base: number | null,
  fixedAmount: number,
): string | null {
  if (base == null || base <= 0) return null;
  return `₪${applyFixedAmount(base, fixedAmount).toFixed(2)}`;
}

export function previewPriceWithOverride(
  base: number | null,
  override: PriceOverride,
): string | null {
  if (base == null || base <= 0) return null;
  return `₪${applyPriceOverride(base, override).toFixed(2)}`;
}

export function isValidPriceOverride(override: PriceOverride): boolean {
  if (override.pricingMode === "fixed_amount") {
    return (
      Number.isFinite(override.fixedAmount) &&
      override.fixedAmount >= FIXED_AMOUNT_MIN &&
      override.fixedAmount <= FIXED_AMOUNT_MAX
    );
  }
  return (
    Number.isFinite(override.markupPercent) &&
    override.markupPercent >= MARKUP_PERCENT_MIN &&
    override.markupPercent <= MARKUP_PERCENT_MAX
  );
}

export type CategoryTreeNode = { id: number; parent: number };

export function buildCategoryChildrenMap(
  categories: CategoryTreeNode[],
): Map<number, number[]> {
  const childrenByParent = new Map<number, number[]>();
  for (const cat of categories) {
    const siblings = childrenByParent.get(cat.parent) ?? [];
    siblings.push(cat.id);
    childrenByParent.set(cat.parent, siblings);
  }
  return childrenByParent;
}

export function buildCategoryParentMap(
  categories: CategoryTreeNode[],
): Map<number, number> {
  return new Map(categories.map((c) => [c.id, c.parent]));
}

/** Match sync resolver: exact category, then ancestors, then any descendant override. */
export function resolveCategoryOverrideLabel(
  supplierId: number,
  categoryId: number,
  overrideLabels: Map<string, string>,
  parentMap: Map<number, number>,
  childrenByParent: Map<number, number[]>,
): string | null {
  const key = (id: number) => `${supplierId}_${id}`;

  const exact = overrideLabels.get(key(categoryId));
  if (exact != null) return exact;

  let current = parentMap.get(categoryId);
  while (current != null && Number.isFinite(current) && current !== 0) {
    const ancestor = overrideLabels.get(key(current));
    if (ancestor != null) return ancestor;
    current = parentMap.get(current);
  }

  function findInDescendants(id: number): string | null {
    const hit = overrideLabels.get(key(id));
    if (hit != null) return hit;
    for (const childId of childrenByParent.get(id) ?? []) {
      const found = findInDescendants(childId);
      if (found != null) return found;
    }
    return null;
  }

  for (const childId of childrenByParent.get(categoryId) ?? []) {
    const found = findInDescendants(childId);
    if (found != null) return found;
  }

  return null;
}
