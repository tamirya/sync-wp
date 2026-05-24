export type ProductPriceFields = {
  regularPrice: number | null;
  salePrice: number | null;
  /** What the supplier site displays as the current price (`prices.price`). */
  displayPrice?: number | null;
};

export type PriceOverride = {
  markupPercent: number;
  useSalePrices: boolean;
};

export function parsePriceString(
  str: string | null | undefined,
): number | null {
  if (!str) return null;
  const n = parseFloat(str.replace(/[^\d.]/g, ""));
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
  return roundPrice(base * (1 + markupPercent / 100));
}

export function roundPrice(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatMarkupLabel(markupPercent: number): string {
  const n = roundPrice(markupPercent);
  if (n === 0) return "0%";
  return n > 0 ? `+${n}%` : `${n}%`;
}

export function adjustMarkupPercent(current: number, delta: number): number {
  return roundPrice(Math.max(0, current + delta));
}

export function previewPriceWithMarkup(
  base: number | null,
  markupPercent: number,
): string | null {
  if (base == null || base <= 0) return null;
  return `₪${applyMarkup(base, markupPercent).toFixed(2)}`;
}
