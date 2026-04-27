"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  SyncToStoreModal,
  type SyncToStoreModalMessages,
} from "@/components/sync-to-store-modal";
import {
  SelectionSidePanel,
  type SelectionSidePanelMessages,
} from "@/components/selection-side-panel";

const PAGE_SIZE = 24;

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
export type ClientSubCategory = {
  id: number;
  name: string;
  parent: number;
  count?: number;
  image?: { src?: string | null; alt?: string | null } | null;
  images?: { src?: string | null; alt?: string | null }[] | null;
  href: string;
  displayCount: number | null;
};

export type ClientProduct = {
  id: number;
  name: string;
  sku: string;
  price: string | null;
  regularPrice: string | null;
  salePrice: string | null;
  stockStatus: string | null;
  stockAvailabilityText: string | null;
  image: { src?: string | null; alt?: string | null } | null;
  permalink: string | null;
};

type Messages = {
  storeCategoryProducts: string;
  storeCategorySubcategoriesTitle: string;
  storeCategoryProductsTitle: string;
  storeCategoryProductsEmpty: string;
  storeCategoryProductsLoadError: string;
  storeProductInStock: string;
  storeProductOutOfStock: string;
  storeProductOnBackorder: string;
  storeProductSalePrice: string;
  supplierCategoryProductsViewLabel: string;
  selectLabel: string;
  selectedLabel: string;
  selectionTotal: string;
  selectionClear: string;
  selectionPanelTitle: string;
  selectionPanelCategoriesSection: string;
  selectionPanelProductsSection: string;
  selectionPanelEmpty: string;
  syncToStoreButton: string;
} & SyncToStoreModalMessages;

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const CARD_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-500",
  "from-red-500 to-orange-600",
  "from-cyan-500 to-sky-600",
  "from-lime-500 to-green-600",
  "from-sky-400 to-cyan-500",
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function parsePrice(str: string | null | undefined): number {
  if (!str) return 0;
  const n = parseFloat(str.replace(/[^\d.]/g, ""));
  return isNaN(n) ? 0 : n;
}

/* ------------------------------------------------------------------ */
/*  Stock badge                                                         */
/* ------------------------------------------------------------------ */
function StockBadge({
  status,
  availabilityText,
  messages,
}: {
  status: string | null;
  availabilityText: string | null;
  messages: Messages;
}) {
  const label =
    availabilityText ??
    (status === "instock"
      ? messages.storeProductInStock
      : status === "outofstock"
        ? messages.storeProductOutOfStock
        : status === "onbackorder"
          ? messages.storeProductOnBackorder
          : null);
  if (!label) return null;
  const cls =
    status === "outofstock"
      ? "bg-red-100 text-red-700 ring-red-200"
      : status === "instock"
        ? "bg-green-100 text-green-700 ring-green-200"
        : "bg-amber-100 text-amber-700 ring-amber-200";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${cls}`}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-category card                                                   */
/* ------------------------------------------------------------------ */
function SubCatCard({
  sub,
  isSelected,
  onToggle,
  messages,
}: {
  sub: ClientSubCategory;
  isSelected: boolean;
  onToggle: () => void;
  messages: Messages;
}) {
  const imgSrc =
    sub.image?.src ??
    (Array.isArray(sub.images) ? sub.images[0]?.src : null) ??
    null;
  const imgAlt =
    sub.image?.alt ??
    (Array.isArray(sub.images) ? sub.images[0]?.alt : null) ??
    sub.name;
  const gradient = CARD_GRADIENTS[sub.id % CARD_GRADIENTS.length];

  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
        isSelected
          ? "border-primary/70 ring-2 ring-primary/20"
          : "border-border/60 hover:border-primary/30"
      }`}
    >
      {/* Gradient thumbnail — links to sub-category page */}
      <Link
        href={sub.href}
        className={`relative block h-28 w-full shrink-0 overflow-hidden bg-gradient-to-br ${gradient}`}
      >
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
        <div className="absolute -left-3 bottom-0 h-14 w-14 rounded-full bg-white/10" />

        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={imgAlt}
            className="h-full w-full object-cover opacity-90"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.25"
              className="h-10 w-10 opacity-90 drop-shadow-sm"
              aria-hidden
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={sub.href}>
          <p className="line-clamp-1 text-sm font-bold text-card-foreground transition-colors hover:text-primary">
            {sub.name}
          </p>
        </Link>

        <div className="flex items-center justify-between">
          {sub.displayCount !== null ? (
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-primary leading-none">
                {sub.displayCount.toLocaleString()}
              </span>
              <span className="text-[11px] text-muted">
                {messages.storeCategoryProducts}
              </span>
            </div>
          ) : (
            <span />
          )}
          <Link
            href={sub.href}
            tabIndex={-1}
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="h-3.5 w-3.5 shrink-0 rtl:rotate-180"
              aria-hidden
            >
              <path
                d="M9 18l6-6-6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>

        {/* Select button */}
        <button
          onClick={onToggle}
          className={`mt-auto w-full rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
            isSelected
              ? "bg-primary text-white shadow-sm hover:bg-primary/90"
              : "border border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          }`}
          aria-label={
            isSelected ? messages.selectedLabel : messages.selectLabel
          }
        >
          {isSelected ? messages.selectedLabel : messages.selectLabel}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Product card                                                        */
/* ------------------------------------------------------------------ */
function ProductCard({
  product,
  isSelected,
  onToggle,
  messages,
}: {
  product: ClientProduct;
  isSelected: boolean;
  onToggle: () => void;
  messages: Messages;
}) {
  const imgSrc = product.image?.src ?? null;
  const imgAlt = product.image?.alt || product.name;
  const hasSale =
    product.salePrice !== null &&
    product.regularPrice !== null &&
    product.salePrice !== product.regularPrice;

  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md ${
        isSelected
          ? "border-primary/70 ring-2 ring-primary/20"
          : "border-border/80 hover:border-primary/40"
      }`}
    >
      {/* Thumbnail */}
      <div className="relative h-44 w-full shrink-0 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={imgAlt}
            className="h-full w-full object-contain p-3 transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              className="h-14 w-14"
              aria-hidden
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        {/* Top: name + SKU + price */}
        <div className="flex-1 space-y-2">
          <div>
            <h3 className="line-clamp-2 text-sm font-bold leading-snug text-card-foreground">
              {product.name}
            </h3>
            {product.sku && (
              <p className="mt-0.5 font-mono text-[11px] text-muted">
                SKU: {product.sku}
              </p>
            )}
          </div>

          {(product.price ?? product.regularPrice) && (
            <div className="flex flex-wrap items-center gap-2">
              {hasSale ? (
                <>
                  <span className="text-base font-bold text-primary">
                    {product.salePrice}
                  </span>
                  <span className="text-sm text-muted line-through">
                    {product.regularPrice}
                  </span>
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {messages.storeProductSalePrice}
                  </span>
                </>
              ) : (
                <span className="text-base font-bold text-card-foreground">
                  {product.price ?? product.regularPrice}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bottom: stock + view + select — always pinned */}
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <StockBadge
              status={product.stockStatus}
              availabilityText={product.stockAvailabilityText}
              messages={messages}
            />
            {product.permalink && (
              <a
                href={product.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted-bg hover:border-primary/40 hover:text-primary"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden
                >
                  <path
                    d="M7 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 2h4v4M14 2 8 8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {messages.supplierCategoryProductsViewLabel}
              </a>
            )}
          </div>

          <button
            onClick={onToggle}
            className={`w-full rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              isSelected
                ? "bg-primary text-white shadow-sm hover:bg-primary/90"
                : "border border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            }`}
          >
            {isSelected ? messages.selectedLabel : messages.selectLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  sessionStorage helpers                                              */
/* ------------------------------------------------------------------ */

type PersistedCatItem = {
  id: number;
  name: string;
  displayCount: number | null | undefined;
  parentName: string | undefined;
};
type PersistedProdItem = {
  id: number;
  name: string;
  sku: string;
  price: string | null;
  regularPrice: string | null;
  parentName: string | undefined;
};
type PersistedSelection = {
  catItems: PersistedCatItem[];
  prodItems: PersistedProdItem[];
};

function storageKey(supplierId: number) {
  return `supplier_sel_${supplierId}`;
}

function loadSelection(supplierId: number): PersistedSelection {
  try {
    const raw = sessionStorage.getItem(storageKey(supplierId));
    if (!raw) return { catItems: [], prodItems: [] };
    return JSON.parse(raw) as PersistedSelection;
  } catch {
    return { catItems: [], prodItems: [] };
  }
}

function saveSelection(supplierId: number, sel: PersistedSelection) {
  try {
    sessionStorage.setItem(storageKey(supplierId), JSON.stringify(sel));
  } catch {
    /* ignore storage errors */
  }
}

/* ------------------------------------------------------------------ */
/*  Unified page client                                                 */
/* ------------------------------------------------------------------ */

export function SupplierCatPageClient({
  subCategories,
  products,
  loadFailed,
  messages,
  locale,
  supplierId,
  currentCategoryName,
}: {
  subCategories: ClientSubCategory[];
  products: ClientProduct[];
  loadFailed: boolean;
  messages: Messages;
  locale: string;
  supplierId: number;
  currentCategoryName?: string;
}) {
  /* IDs — used for card highlight UI on the current page */
  const [selectedCatIds, setSelectedCatIds] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set();
    const sel = loadSelection(supplierId);
    return new Set(sel.catItems.map((c) => c.id));
  });
  const [selectedProdIds, setSelectedProdIds] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set();
    const sel = loadSelection(supplierId);
    return new Set(sel.prodItems.map((p) => p.id));
  });

  /* Full item data — displayed in the panel across all category pages */
  const [panelCatItems, setPanelCatItems] = useState<PersistedCatItem[]>(() => {
    if (typeof window === "undefined") return [];
    return loadSelection(supplierId).catItems;
  });
  const [panelProdItems, setPanelProdItems] = useState<PersistedProdItem[]>(
    () => {
      if (typeof window === "undefined") return [];
      return loadSelection(supplierId).prodItems;
    },
  );

  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  /* Helper — save immediately (not deferred) so rapid navigation can't lose data */
  function persist(cats: PersistedCatItem[], prods: PersistedProdItem[]) {
    saveSelection(supplierId, { catItems: cats, prodItems: prods });
  }

  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting)
          setVisibleCount((prev) =>
            Math.min(prev + PAGE_SIZE, products.length),
          );
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, products.length]);

  function toggleCat(id: number) {
    const isSelected = selectedCatIds.has(id);
    const nextCatIds = new Set(selectedCatIds);
    isSelected ? nextCatIds.delete(id) : nextCatIds.add(id);
    setSelectedCatIds(nextCatIds);

    let nextCatItems: PersistedCatItem[];
    if (isSelected) {
      nextCatItems = panelCatItems.filter((c) => c.id !== id);
    } else {
      const sub = subCategories.find((c) => c.id === id);
      nextCatItems = sub
        ? [
            ...panelCatItems,
            {
              id,
              name: sub.name,
              displayCount: sub.displayCount,
              parentName: currentCategoryName,
            },
          ]
        : panelCatItems;
    }
    setPanelCatItems(nextCatItems);
    persist(nextCatItems, panelProdItems);
  }

  function toggleProd(id: number) {
    const isSelected = selectedProdIds.has(id);
    const nextProdIds = new Set(selectedProdIds);
    isSelected ? nextProdIds.delete(id) : nextProdIds.add(id);
    setSelectedProdIds(nextProdIds);

    let nextProdItems: PersistedProdItem[];
    if (isSelected) {
      nextProdItems = panelProdItems.filter((p) => p.id !== id);
    } else {
      const prod = products.find((p) => p.id === id);
      nextProdItems = prod
        ? [
            ...panelProdItems,
            {
              id,
              name: prod.name,
              sku: prod.sku,
              price: prod.price,
              regularPrice: prod.regularPrice,
              parentName: currentCategoryName,
            },
          ]
        : panelProdItems;
    }
    setPanelProdItems(nextProdItems);
    persist(panelCatItems, nextProdItems);
  }

  function clearAll() {
    setSelectedCatIds(new Set());
    setSelectedProdIds(new Set());
    setPanelCatItems([]);
    setPanelProdItems([]);
    persist([], []);
  }

  const grandTotal = panelProdItems.reduce(
    (sum, p) => sum + parsePrice(p.price ?? p.regularPrice),
    0,
  );
  return (
    <>
      {/* Sub-categories section */}
      {subCategories.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted">
            {messages.storeCategorySubcategoriesTitle}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subCategories.map((sub) => (
              <SubCatCard
                key={sub.id}
                sub={sub}
                isSelected={selectedCatIds.has(sub.id)}
                onToggle={() => toggleCat(sub.id)}
                messages={messages}
              />
            ))}
          </div>
        </section>
      )}

      {/* Products section */}
      <section className="mt-10">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted">
          {messages.storeCategoryProductsTitle}{" "}
          {!loadFailed && (
            <span className="font-semibold text-foreground normal-case tracking-normal">
              ({products.length})
            </span>
          )}
        </h2>

        {loadFailed ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive">
            {messages.storeCategoryProductsLoadError}
          </p>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/40 px-8 py-16 text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-12 w-12 text-muted/50"
              aria-hidden
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p className="mt-4 max-w-sm text-sm text-muted">
              {messages.storeCategoryProductsEmpty}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSelected={selectedProdIds.has(product.id)}
                  onToggle={() => toggleProd(product.id)}
                  messages={messages}
                />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="flex justify-center">
              {hasMore && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span>
                    {visibleCount} / {products.length}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Floating selection side panel */}
      <SelectionSidePanel
        selectedCategories={panelCatItems}
        selectedProducts={panelProdItems}
        grandTotal={grandTotal}
        onToggleCategory={toggleCat}
        onToggleProduct={toggleProd}
        onClear={clearAll}
        onSync={() => setSyncModalOpen(true)}
        messages={{
          panelTitle: messages.selectionPanelTitle,
          panelCategoriesSection: messages.selectionPanelCategoriesSection,
          panelProductsSection: messages.selectionPanelProductsSection,
          panelEmpty: messages.selectionPanelEmpty,
          panelTotal: messages.selectionTotal,
          panelClear: messages.selectionClear,
          panelSync: messages.syncToStoreButton,
        }}
      />

      <SyncToStoreModal
        open={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        locale={locale}
        supplierId={supplierId}
        selectedCategoryIds={panelCatItems.map((c) => c.id)}
        selectedProductIds={panelProdItems.map((p) => p.id)}
        messages={messages}
        onSuccess={() => {
          setSyncModalOpen(false);
          clearAll();
        }}
      />
    </>
  );
}
