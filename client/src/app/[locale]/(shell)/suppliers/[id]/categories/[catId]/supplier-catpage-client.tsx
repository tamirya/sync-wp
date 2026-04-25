"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  SyncToStoreModal,
  type SyncToStoreModalMessages,
} from "@/components/sync-to-store-modal";

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
  syncToStoreButton: string;
} & SyncToStoreModalMessages;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function parsePrice(str: string | null | undefined): number {
  if (!str) return 0;
  const n = parseFloat(str.replace(/[^\d.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function formatTotal(total: number): string {
  return (
    "₪" +
    total.toLocaleString("he-IL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
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
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${cls}`}>
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

  return (
    <div
      className={`group flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${
        isSelected
          ? "border-primary/70 ring-2 ring-primary/20"
          : "border-border/80 hover:border-primary/40"
      }`}
    >
      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-50 to-cyan-100">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt={imgAlt} className="h-full w-full object-cover" />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            className="h-5 w-5 text-cyan-400"
            aria-hidden
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </div>

      {/* Text — links to sub-category page */}
      <Link href={sub.href} className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-card-foreground transition-colors hover:text-primary">
          {sub.name}
        </p>
        {sub.displayCount !== null && (
          <p className="text-[11px] text-muted">
            {sub.displayCount} {messages.storeCategoryProducts}
          </p>
        )}
      </Link>

      {/* Select toggle */}
      <button
        onClick={onToggle}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition-all ${
          isSelected
            ? "border-primary bg-primary text-white"
            : "border-border bg-card text-muted hover:border-primary/50 hover:text-primary"
        }`}
        aria-label={isSelected ? messages.selectedLabel : messages.selectLabel}
        title={isSelected ? messages.selectedLabel : messages.selectLabel}
      >
        {isSelected ? (
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
            <path d="M13.5 4 6 11.5l-3.5-3.5 1-1L6 9.5l6.5-6.5 1 1Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5" aria-hidden>
            <rect x="2" y="2" width="12" height="12" rx="2" />
          </svg>
        )}
      </button>

      {/* Navigation chevron */}
      <Link href={sub.href} tabIndex={-1} aria-hidden>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4 shrink-0 text-muted/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        >
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
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
/*  Unified page client                                                 */
/* ------------------------------------------------------------------ */
export function SupplierCatPageClient({
  subCategories,
  products,
  loadFailed,
  messages,
  locale,
  supplierId,
}: {
  subCategories: ClientSubCategory[];
  products: ClientProduct[];
  loadFailed: boolean;
  messages: Messages;
  locale: string;
  supplierId: number;
}) {
  const [selectedCatIds, setSelectedCatIds] = useState<Set<number>>(new Set());
  const [selectedProdIds, setSelectedProdIds] = useState<Set<number>>(new Set());
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting)
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, products.length));
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, products.length]);

  function toggleCat(id: number) {
    setSelectedCatIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleProd(id: number) {
    setSelectedProdIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedCats = subCategories.filter((c) => selectedCatIds.has(c.id));
  const selectedProds = products.filter((p) => selectedProdIds.has(p.id));
  const grandTotal = selectedProds.reduce(
    (sum, p) => sum + parsePrice(p.price ?? p.regularPrice),
    0,
  );
  const anySelected = selectedCatIds.size > 0 || selectedProdIds.size > 0;

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
            <div className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

      {/* Combined bottom selection bar */}
      {anySelected && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-card/95 shadow-[0_-4px_24px_rgba(0,0,0,0.10)] backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 py-4">
            {/* Chips */}
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {/* Category chips */}
              {selectedCats.map((c) => (
                <span
                  key={`cat-${c.id}`}
                  className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 shrink-0" aria-hidden>
                    <path d="M3 3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H8.5L7 3H3z" />
                  </svg>
                  <span className="max-w-[130px] truncate">{c.name}</span>
                  {c.displayCount !== null && (
                    <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold">
                      {c.displayCount}
                    </span>
                  )}
                  <button
                    onClick={() => toggleCat(c.id)}
                    className="ml-0.5 text-primary/60 transition-colors hover:text-primary"
                    aria-label="הסר קטגוריה"
                  >
                    ×
                  </button>
                </span>
              ))}

              {/* Product chips */}
              {selectedProds.map((p) => (
                <span
                  key={`prod-${p.id}`}
                  className="flex items-center gap-2 rounded-full border border-cyan-300/50 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3 w-3 shrink-0" aria-hidden>
                    <rect x="2" y="2" width="12" height="12" rx="1.5" />
                    <circle cx="5.5" cy="5.5" r="1" />
                    <path d="M14 10 10 6 2 14" />
                  </svg>
                  <span className="max-w-[130px] truncate">{p.name}</span>
                  {(p.price ?? p.regularPrice) && (
                    <span className="text-cyan-600/80">
                      {p.price ?? p.regularPrice}
                    </span>
                  )}
                  <button
                    onClick={() => toggleProd(p.id)}
                    className="ml-0.5 text-cyan-600/60 transition-colors hover:text-cyan-700"
                    aria-label="הסר מוצר"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Total + actions */}
            <div className="flex shrink-0 items-center gap-3">
              {grandTotal > 0 && (
                <span className="text-sm font-bold text-foreground">
                  {messages.selectionTotal}: {formatTotal(grandTotal)}
                </span>
              )}
              <button
                onClick={() => setSyncModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0" aria-hidden>
                  <path d="M1 4v6h6" /><path d="M23 20v-6h-6" />
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
                </svg>
                {messages.syncToStoreButton}
              </button>
              <button
                onClick={() => {
                  setSelectedCatIds(new Set());
                  setSelectedProdIds(new Set());
                }}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-destructive/40 hover:text-destructive"
              >
                {messages.selectionClear}
              </button>
            </div>
          </div>
        </div>
      )}

      <SyncToStoreModal
        open={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        locale={locale}
        supplierId={supplierId}
        selectedCategoryIds={Array.from(selectedCatIds)}
        selectedProductIds={Array.from(selectedProdIds)}
        messages={messages}
        onSuccess={() => {
          setSyncModalOpen(false);
          setSelectedCatIds(new Set());
          setSelectedProdIds(new Set());
        }}
      />
    </>
  );
}
