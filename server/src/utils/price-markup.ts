export type StoreApiPricesLike = {
  price: string;
  regular_price: string;
  sale_price: string;
  currency_minor_unit: number;
};

export type MarkupOverride = {
  markupPercent: number;
  useSalePrices: boolean;
};

/** Parse Store API minor-unit prices to major currency units. */
export function storeApiPricesToMajor(prices: StoreApiPricesLike, onSale: boolean): { regular: number; sale: number | null } {
  const minor = Number.isFinite(prices.currency_minor_unit) ? prices.currency_minor_unit : 0;
  const div = 10 ** minor;
  const toMajor = (s: string): number => {
    const n = Number(s);
    if (!Number.isFinite(n)) return 0;
    return n / div;
  };

  const regular = toMajor(prices.regular_price || prices.price || '0');
  const saleRaw = prices.sale_price;
  const sale =
    onSale && saleRaw && saleRaw !== prices.regular_price ? toMajor(saleRaw) : saleRaw ? toMajor(saleRaw) : null;

  return { regular, sale };
}

/** Effective supplier base price before markup (regular vs sale per flag). */
export function effectiveSupplierBasePrice(
  regular: number,
  sale: number | null,
  useSalePrices: boolean,
): number | null {
  const hasSale = sale != null && regular > 0 && sale > 0 && sale < regular;
  if (useSalePrices && hasSale) return sale;
  if (regular > 0) return regular;
  if (useSalePrices && sale != null && sale > 0) return sale;
  return null;
}

export function effectivePriceFromStoreApi(
  prices: StoreApiPricesLike,
  onSale: boolean,
  useSalePrices: boolean,
): number | null {
  const { regular, sale } = storeApiPricesToMajor(prices, onSale);
  return effectiveSupplierBasePrice(regular, sale, useSalePrices);
}

export function applyMarkupPercent(base: number, markupPercent: number): number {
  const pct = Number(markupPercent);
  const safePct = Number.isFinite(pct) ? pct : 0;
  return Math.round(base * (1 + safePct / 100) * 100) / 100;
}

export function formatWooPrice(n: number): string {
  return n.toFixed(2);
}

/** Current price shown to customers on the supplier site (`prices.price`). */
export function supplierDisplayPriceMajor(prices: StoreApiPricesLike, onSale: boolean): number | null {
  const minor = Number.isFinite(prices.currency_minor_unit) ? prices.currency_minor_unit : 0;
  const div = 10 ** minor;
  const toMajor = (s: string): number => {
    const n = Number(s);
    if (!Number.isFinite(n)) return 0;
    return n / div;
  };

  const fromPrice = prices.price ? toMajor(prices.price) : 0;
  if (fromPrice > 0) return fromPrice;

  const { regular, sale } = storeApiPricesToMajor(prices, onSale);
  return effectiveSupplierBasePrice(regular, sale, onSale);
}

/**
 * Build WooCommerce prices after applying a markup override.
 * Store products get a single marked-up regular price; sale is cleared.
 */
export function buildMarkedUpWooPrices(
  prices: StoreApiPricesLike,
  onSale: boolean,
  override: MarkupOverride,
): { regular_price: string; sale_price: string } {
  const markup = Number(override.markupPercent) || 0;
  const { regular } = storeApiPricesToMajor(prices, onSale);
  const base = override.useSalePrices
    ? supplierDisplayPriceMajor(prices, onSale)
    : regular > 0
      ? regular
      : supplierDisplayPriceMajor(prices, onSale);

  if (base == null || base <= 0) {
    return { regular_price: '0.00', sale_price: '' };
  }

  return {
    regular_price: formatWooPrice(applyMarkupPercent(base, markup)),
    sale_price: '',
  };
}

/** Normalize Store API or Woo REST price fields from a catalog payload. */
export function normalizePricesFromCatalogPayload(p: Record<string, unknown>): StoreApiPricesLike {
  const defaults: StoreApiPricesLike = {
    price: '0',
    regular_price: '0',
    sale_price: '0',
    currency_minor_unit: 0,
  };
  const pricesRaw = p.prices;
  if (pricesRaw && typeof pricesRaw === 'object' && !Array.isArray(pricesRaw)) {
    return { ...defaults, ...(pricesRaw as StoreApiPricesLike) };
  }
  const regular =
    typeof p.regular_price === 'string' || typeof p.regular_price === 'number'
      ? String(p.regular_price)
      : typeof p.price === 'string' || typeof p.price === 'number'
        ? String(p.price)
        : '0';
  const sale =
    typeof p.sale_price === 'string' || typeof p.sale_price === 'number' ? String(p.sale_price) : '0';
  const price =
    typeof p.price === 'string' || typeof p.price === 'number' ? String(p.price) : regular;
  return {
    price,
    regular_price: regular,
    sale_price: sale,
    currency_minor_unit: 0,
  };
}
