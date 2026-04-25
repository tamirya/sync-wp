/** Flat Woo-like category row from GET .../categories */
export type MappingCategoryFlat = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count?: number;
};

export type MappingProductRow = {
  id: number;
  name: string;
  sku: string;
  categories: { id: number }[];
  /** Display price (e.g. formatted from WC Store API `prices` block), or null */
  price: string | null;
  /** WC Store API `prices.regular_price` formatted (supplier column uses this) */
  regularPrice: string | null;
  /** When API exposes numeric stock (e.g. `stock_quantity`) */
  stockQuantity: number | null;
  /** Woo-like `stock_status`: instock | outofstock | onbackorder, or null */
  stockStatus: string | null;
  /** WC Store API `stock_availability.text` (e.g. Hebrew label), when present */
  stockAvailabilityText: string | null;
};

export type MappingCategoryNode = {
  id: number;
  name: string;
  count?: number;
  children: MappingCategoryNode[];
};

/**
 * Build a forest from Woo categories (`parent` points to parent id, 0 = root).
 */
export function buildCategoryTree(
  flat: MappingCategoryFlat[],
): MappingCategoryNode[] {
  const nodes = new Map<number, MappingCategoryNode>();
  for (const c of flat) {
    nodes.set(c.id, {
      id: c.id,
      name: c.name,
      count: c.count,
      children: [],
    });
  }

  const roots: MappingCategoryNode[] = [];
  for (const c of flat) {
    const node = nodes.get(c.id);
    if (!node) {
      continue;
    }
    const parentId =
      typeof c.parent === "number" && Number.isFinite(c.parent)
        ? c.parent
        : 0;
    if (parentId === 0) {
      roots.push(node);
    } else {
      const p = nodes.get(parentId);
      if (p) {
        p.children.push(node);
      } else {
        roots.push(node);
      }
    }
  }

  function sortTree(list: MappingCategoryNode[]) {
    list.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
    for (const n of list) {
      sortTree(n.children);
    }
  }
  sortTree(roots);
  return roots;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(Number.parseInt(dec, 10)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    );
}

function stringishPrice(v: unknown): string | null {
  if (typeof v === "string" && v.trim() !== "") {
    return v.trim();
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return String(v);
  }
  if (v && typeof v === "object") {
    const rec = v as Record<string, unknown>;
    for (const key of ["amount", "value", "raw", "price"]) {
      const inner = rec[key];
      const s = stringishPrice(inner);
      if (s) {
        return s;
      }
    }
  }
  return null;
}

const PRICE_FIELD_KEYS = new Set([
  "price",
  "regular_price",
  "sale_price",
  "regularPrice",
  "salePrice",
  "list_price",
  "listPrice",
  "unit_price",
  "unitPrice",
  "cost",
  "retail_price",
  "retailPrice",
  "wholesale_price",
  "base_price",
  "basePrice",
]);

function pickProductPrice(o: Record<string, unknown>): string | null {
  for (const key of PRICE_FIELD_KEYS) {
    const s = stringishPrice(o[key]);
    if (s) {
      return s;
    }
  }
  const variants = o.variants;
  if (Array.isArray(variants) && variants[0] && typeof variants[0] === "object") {
    const v = pickProductPrice(variants[0] as Record<string, unknown>);
    if (v) {
      return v;
    }
  }
  return null;
}

function deepWalkPick<T>(
  root: Record<string, unknown>,
  maxDepth: number,
  pick: (rec: Record<string, unknown>) => T | null,
  visited = new WeakSet<object>(),
): T | null {
  function walk(value: unknown, depth: number): T | null {
    if (depth <= 0 || value == null) {
      return null;
    }
    if (typeof value !== "object") {
      return null;
    }
    if (visited.has(value)) {
      return null;
    }
    visited.add(value);
    if (Array.isArray(value)) {
      for (const el of value) {
        const hit = walk(el, depth - 1);
        if (hit != null) {
          return hit;
        }
      }
      return null;
    }
    const rec = value as Record<string, unknown>;
    const direct = pick(rec);
    if (direct != null) {
      return direct;
    }
    for (const v of Object.values(rec)) {
      if (v != null && typeof v === "object") {
        const hit = walk(v, depth - 1);
        if (hit != null) {
          return hit;
        }
      }
    }
    return null;
  }
  return walk(root, maxDepth);
}

/** WC Store API (`/wc/store/products`): amounts are in currency minor units. */
export function formatWooStorePriceFromFields(
  prices: unknown,
  pick: "sale_first" | "regular_only",
): string | null {
  if (!prices || typeof prices !== "object") {
    return null;
  }
  const p = prices as Record<string, unknown>;
  const raw =
    pick === "regular_only"
      ? p.regular_price
      : p.price ?? p.sale_price ?? p.regular_price;
  if (raw === null || raw === undefined) {
    return null;
  }
  const minor =
    typeof p.currency_minor_unit === "number" && p.currency_minor_unit >= 0
      ? p.currency_minor_unit
      : 2;
  const num =
    typeof raw === "number"
      ? raw
      : Number(String(raw).replace(/,/g, ""));
  if (!Number.isFinite(num)) {
    return null;
  }
  const major = minor > 0 ? num / 10 ** minor : num;
  const decimals = minor > 0 ? Math.min(minor, 4) : 0;
  const formatted =
    decimals > 0 ? major.toFixed(decimals) : String(major);
  const sym =
    typeof p.currency_prefix === "string" && p.currency_prefix.trim() !== ""
      ? p.currency_prefix.trim()
      : typeof p.currency_symbol === "string"
        ? p.currency_symbol.trim()
        : "";
  if (sym) {
    return `${sym}${formatted}`;
  }
  return formatted;
}

function formatWooStorePricesObject(prices: unknown): string | null {
  return formatWooStorePriceFromFields(prices, "sale_first");
}

function extractProductPrice(o: Record<string, unknown>): string | null {
  const fromStoreBlock = formatWooStorePricesObject(o.prices);
  if (fromStoreBlock) {
    return fromStoreBlock;
  }
  const shallow = pickProductPrice(o);
  if (shallow) {
    return shallow;
  }
  return deepWalkPick(o, 8, (rec) => {
    for (const k of PRICE_FIELD_KEYS) {
      if (Object.prototype.hasOwnProperty.call(rec, k)) {
        const s = stringishPrice(rec[k]);
        if (s) {
          return s;
        }
      }
    }
    return null;
  });
}

function parseQuantity(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return null;
}

const STOCK_QTY_FIELD_KEYS = new Set([
  "stock_quantity",
  "stockQuantity",
  "quantity",
  "qty",
  "available_quantity",
  "availableQuantity",
  "inventory_quantity",
  "inventoryQuantity",
  "stock",
  "on_hand",
  "onHand",
  "low_stock_remaining",
  "lowStockRemaining",
]);

function pickStockParts(o: Record<string, unknown>): {
  stockQuantity: number | null;
  stockStatus: string | null;
} {
  const qtyKeys = [...STOCK_QTY_FIELD_KEYS];
  let stockQuantity: number | null = null;
  for (const key of qtyKeys) {
    const q = parseQuantity(o[key]);
    if (q !== null) {
      stockQuantity = q;
      break;
    }
  }

  const statusKeys = ["stock_status", "stockStatus", "availability"];
  let stockStatus: string | null = null;
  for (const key of statusKeys) {
    const ss = o[key];
    if (typeof ss === "string" && ss.trim() !== "") {
      stockStatus = ss.trim().toLowerCase();
      break;
    }
  }

  if (o.is_on_backorder === true) {
    stockStatus = "onbackorder";
  } else if (typeof o.is_in_stock === "boolean") {
    stockStatus = o.is_in_stock ? "instock" : "outofstock";
  } else if (stockStatus === null) {
    if (o.in_stock === true || o.inStock === true) {
      stockStatus = "instock";
    } else if (o.in_stock === false || o.inStock === false) {
      stockStatus = "outofstock";
    }
  }

  const stockAvail = o.stock_availability;
  if (stockAvail && typeof stockAvail === "object") {
    const cls = (stockAvail as { class?: unknown }).class;
    if (typeof cls === "string") {
      const normalized = cls.trim().toLowerCase().replace(/_/g, "-");
      if (
        normalized.includes("out-of-stock") ||
        normalized.includes("outofstock")
      ) {
        stockStatus = "outofstock";
      } else if (
        normalized.includes("in-stock") ||
        normalized === "instock"
      ) {
        stockStatus = "instock";
      } else if (
        normalized.includes("backorder") ||
        normalized.includes("on-backorder")
      ) {
        stockStatus = "onbackorder";
      }
    }
  }

  if (stockQuantity === null && o.inventory && typeof o.inventory === "object") {
    const inv = o.inventory as Record<string, unknown>;
    const nestedQtyKeys = [
      "quantity",
      "stock_quantity",
      "stockQuantity",
      "available_quantity",
      "availableQuantity",
    ];
    for (const key of nestedQtyKeys) {
      const q = parseQuantity(inv[key]);
      if (q !== null) {
        stockQuantity = q;
        break;
      }
    }
    if (stockStatus === null) {
      const invSs = inv.stock_status ?? inv.stockStatus;
      if (typeof invSs === "string" && invSs.trim() !== "") {
        stockStatus = invSs.trim().toLowerCase();
      }
    }
  }

  return {
    stockQuantity,
    stockStatus: normalizeWooLikeStockStatus(stockStatus),
  };
}

function extractStockParts(o: Record<string, unknown>): {
  stockQuantity: number | null;
  stockStatus: string | null;
} {
  let { stockQuantity, stockStatus } = pickStockParts(o);
  if (stockQuantity === null) {
    const dq = deepWalkPick(o, 8, (rec) => {
      for (const k of STOCK_QTY_FIELD_KEYS) {
        if (Object.prototype.hasOwnProperty.call(rec, k)) {
          const q = parseQuantity(rec[k]);
          if (q !== null) {
            return q;
          }
        }
      }
      return null;
    });
    if (dq !== null) {
      stockQuantity = dq;
    }
  }
  if (stockStatus === null) {
    const ds = deepWalkPick(o, 8, (rec) => {
      for (const k of ["stock_status", "stockStatus", "availability"] as const) {
        if (Object.prototype.hasOwnProperty.call(rec, k)) {
          const ss = rec[k];
          if (typeof ss === "string" && ss.trim() !== "") {
            return ss.trim();
          }
        }
      }
      if (rec.in_stock === true || rec.inStock === true) {
        return "instock";
      }
      if (rec.in_stock === false || rec.inStock === false) {
        return "outofstock";
      }
      return null;
    });
    if (ds != null) {
      stockStatus = normalizeWooLikeStockStatus(ds);
    }
  }
  return { stockQuantity, stockStatus };
}

/** Map common API spellings to Woo-like codes for UI labels. */
function normalizeWooLikeStockStatus(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  const t = raw.trim().toLowerCase().replace(/-/g, "_");
  if (t === "in_stock" || t === "available" || t === "instock") {
    return "instock";
  }
  if (t === "out_of_stock" || t === "outofstock" || t === "unavailable") {
    return "outofstock";
  }
  if (t === "on_backorder" || t === "onbackorder") {
    return "onbackorder";
  }
  return raw.trim();
}

export function parseProductsFromApi(data: unknown): MappingProductRow[] {
  if (!Array.isArray(data)) {
    return [];
  }
  const out: MappingProductRow[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const o = row as Record<string, unknown>;
    const merged: Record<string, unknown> =
      o.product && typeof o.product === "object"
        ? { ...(o.product as Record<string, unknown>), ...o }
        : o;
    const idRaw = merged.id;
    const id =
      typeof idRaw === "number"
        ? idRaw
        : typeof idRaw === "string"
          ? Number(idRaw)
          : NaN;
    if (!Number.isFinite(id)) {
      continue;
    }
    const rawName =
      typeof merged.name === "string"
        ? merged.name
        : String(merged.name ?? "—");
    const name = decodeHtmlEntities(rawName);
    const sku = typeof merged.sku === "string" ? merged.sku : "";
    const price = extractProductPrice(merged);
    const regularPrice = formatWooStorePriceFromFields(
      merged.prices,
      "regular_only",
    );
    const { stockQuantity, stockStatus } = extractStockParts(merged);
    let stockAvailabilityText: string | null = null;
    const sa = merged.stock_availability;
    if (sa && typeof sa === "object") {
      const tx = (sa as { text?: unknown }).text;
      if (typeof tx === "string" && tx.trim() !== "") {
        stockAvailabilityText = decodeHtmlEntities(tx.trim());
      }
    }
    const categories: { id: number }[] = [];
    const catsRaw = merged.categories;
    if (Array.isArray(catsRaw)) {
      for (const c of catsRaw) {
        if (c && typeof c === "object" && "id" in c) {
          const cid = (c as { id: unknown }).id;
          const n =
            typeof cid === "number"
              ? cid
              : typeof cid === "string"
                ? Number(cid)
                : NaN;
          if (Number.isFinite(n)) {
            categories.push({ id: n });
          }
        }
      }
    }
    out.push({
      id,
      name,
      sku,
      categories,
      price,
      regularPrice,
      stockQuantity,
      stockStatus,
      stockAvailabilityText,
    });
  }
  return out;
}

/** Products that list this category id in their `categories` array. */
export function productsForCategory(
  products: MappingProductRow[],
  categoryId: number,
): MappingProductRow[] {
  return products.filter((p) =>
    p.categories.some((c) => c.id === categoryId),
  );
}

/** Category id + all descendant category ids (depth-first). */
export function collectDescendantCategoryIds(
  node: MappingCategoryNode,
): number[] {
  const out: number[] = [node.id];
  for (const ch of node.children) {
    out.push(...collectDescendantCategoryIds(ch));
  }
  return out;
}

/** Distinct product ids that belong to any category in this node's subtree. */
export function collectProductIdsInCategorySubtree(
  node: MappingCategoryNode,
  products: MappingProductRow[],
): number[] {
  const catIds = new Set(collectDescendantCategoryIds(node));
  const ids = new Set<number>();
  for (const p of products) {
    if (p.categories.some((c) => catIds.has(c.id))) {
      ids.add(p.id);
    }
  }
  return [...ids];
}

export type CategorySubtreeSelection = "all" | "some" | "none";

/** Whether the subtree is fully selected, partially, or not at all. */
export function categorySubtreeSelectionState(
  node: MappingCategoryNode,
  selectedCategories: Set<number>,
  selectedProducts: Set<number>,
  products: MappingProductRow[],
): CategorySubtreeSelection {
  const catIds = collectDescendantCategoryIds(node);
  const prodIds = collectProductIdsInCategorySubtree(node, products);

  let catOk = 0;
  for (const id of catIds) {
    if (selectedCategories.has(id)) {
      catOk++;
    }
  }
  let prodOk = 0;
  for (const id of prodIds) {
    if (selectedProducts.has(id)) {
      prodOk++;
    }
  }

  const allCats = catIds.length === 0 || catOk === catIds.length;
  const allProds = prodIds.length === 0 || prodOk === prodIds.length;
  const anySel = catOk > 0 || prodOk > 0;

  if (allCats && allProds) {
    return "all";
  }
  if (!anySel) {
    return "none";
  }
  return "some";
}

// ─── Search / filter ─────────────────────────────────────────────────────────

function normalizeForSearch(s: string): string {
  return s.trim().toLowerCase();
}

function productMatchesQuery(p: MappingProductRow, q: string): boolean {
  return (
    normalizeForSearch(p.name).includes(q) ||
    normalizeForSearch(p.sku).includes(q)
  );
}

/**
 * Filter a category node tree to only nodes that match `query` in their name
 * OR that have matching products OR that have matching descendants.
 *
 * Returns `null` when the node (and its entire subtree) has no matches.
 * Products are filtered so only matching ones are kept inside each node.
 */
export function filterCategoryTree(
  nodes: MappingCategoryNode[],
  allProducts: MappingProductRow[],
  query: string,
): MappingCategoryNode[] {
  if (!query) {
    return nodes;
  }
  const q = normalizeForSearch(query);
  const productsByCatId = new Map<number, MappingProductRow[]>();
  for (const p of allProducts) {
    for (const c of p.categories) {
      if (!productsByCatId.has(c.id)) {
        productsByCatId.set(c.id, []);
      }
      productsByCatId.get(c.id)!.push(p);
    }
  }

  function walkNode(node: MappingCategoryNode): MappingCategoryNode | null {
    const filteredChildren = node.children
      .map(walkNode)
      .filter((n): n is MappingCategoryNode => n !== null);

    const catProds = productsByCatId.get(node.id) ?? [];
    const matchingProds = catProds.filter((p) => productMatchesQuery(p, q));

    const catNameMatches = normalizeForSearch(node.name).includes(q);
    const hasChildHits = filteredChildren.length > 0;
    const hasProductHits = matchingProds.length > 0;

    if (!catNameMatches && !hasChildHits && !hasProductHits) {
      return null;
    }

    return {
      id: node.id,
      name: node.name,
      count: node.count,
      children: filteredChildren,
    };
  }

  return nodes.map(walkNode).filter((n): n is MappingCategoryNode => n !== null);
}

/**
 * Collect all category ids that should be auto-expanded when a query is active.
 * A node is expanded if it or any of its descendants has a match.
 */
export function expandedIdsForQuery(
  nodes: MappingCategoryNode[],
  allProducts: MappingProductRow[],
  query: string,
): Set<number> {
  const result = new Set<number>();
  if (!query) {
    return result;
  }
  const q = normalizeForSearch(query);
  const productCatIds = new Set(
    allProducts
      .filter((p) => productMatchesQuery(p, q))
      .flatMap((p) => p.categories.map((c) => c.id)),
  );

  function walk(node: MappingCategoryNode): boolean {
    const catNameMatches = normalizeForSearch(node.name).includes(q);
    const hasMatchingProducts = productCatIds.has(node.id);
    const childHit = node.children.some((ch) => walk(ch));

    if (catNameMatches || hasMatchingProducts || childHit) {
      result.add(node.id);
      return true;
    }
    return false;
  }

  for (const node of nodes) {
    walk(node);
  }
  return result;
}

/**
 * Filter products for a category given the current search query.
 * When no query, returns all products. When searching, returns only matches.
 */
export function filteredProductsForCategory(
  products: MappingProductRow[],
  categoryId: number,
  query: string,
): MappingProductRow[] {
  const cat = products.filter((p) =>
    p.categories.some((c) => c.id === categoryId),
  );
  if (!query) {
    return cat;
  }
  const q = normalizeForSearch(query);
  return cat.filter((p) => productMatchesQuery(p, q));
}

export type MappingStockDotKind = "in" | "out" | "unknown";

/** Green / red dot next to stock line: in stock vs out of stock. */
export function mappingStockDotKind(p: MappingProductRow): MappingStockDotKind {
  if (p.stockQuantity !== null && Number.isFinite(p.stockQuantity)) {
    if (p.stockQuantity > 0) {
      return "in";
    }
    if (p.stockQuantity === 0) {
      return "out";
    }
    return "unknown";
  }
  switch (p.stockStatus) {
    case "instock":
    case "onbackorder":
      return "in";
    case "outofstock":
      return "out";
    default:
      return "unknown";
  }
}

/**
 * Build a flat id→name lookup from a category tree.
 * Used by the mapping rules list to resolve category IDs to names.
 */
export function flattenTreeToNameMap(
  nodes: MappingCategoryNode[],
): Map<number, string> {
  const map = new Map<number, string>();
  function walk(list: MappingCategoryNode[]) {
    for (const n of list) {
      map.set(n.id, n.name);
      if (n.children.length > 0) {
        walk(n.children);
      }
    }
  }
  walk(nodes);
  return map;
}
