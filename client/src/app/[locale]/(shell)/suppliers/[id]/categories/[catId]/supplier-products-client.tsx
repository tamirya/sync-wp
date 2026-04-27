"use client";

import { useEffect, useRef, useState } from "react";
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
export type SelectableProduct = {
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
  storeProductInStock: string;
  storeProductOutOfStock: string;
  storeProductOnBackorder: string;
  storeProductSalePrice: string;
  supplierCategoryProductsViewLabel: string;
  storeCategoryProductsEmpty: string;
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
/*  Client Component                                                    */
/* ------------------------------------------------------------------ */
export function SupplierProductsClient({
  products,
  messages,
  locale,
  supplierId,
}: {
  products: SelectableProduct[];
  messages: Messages;
  locale: string;
  supplierId: number;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
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
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + PAGE_SIZE, products.length),
          );
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, products.length]);

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedProducts = products.filter((p) => selectedIds.has(p.id));
  const grandTotal = selectedProducts.reduce(
    (sum, p) => sum + parsePrice(p.price ?? p.regularPrice),
    0,
  );

  if (products.length === 0) {
    return (
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
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleProducts.map((product) => {
          const isSelected = selectedIds.has(product.id);
          const imgSrc = product.image?.src ?? null;
          const imgAlt = product.image?.alt || product.name;
          const hasSale =
            product.salePrice !== null &&
            product.regularPrice !== null &&
            product.salePrice !== product.regularPrice;

          return (
            <div
              key={product.id}
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

                {/* Bottom: stock + view + select — always pinned to bottom */}
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
                    onClick={() => toggle(product.id)}
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
        })}
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

      {/* Floating selection side panel */}
      <SelectionSidePanel
        selectedCategories={[]}
        selectedProducts={selectedProducts.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.price,
          regularPrice: p.regularPrice,
        }))}
        grandTotal={grandTotal}
        onToggleCategory={() => {}}
        onToggleProduct={toggle}
        onClear={() => setSelectedIds(new Set())}
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
        selectedCategoryIds={[]}
        selectedProductIds={Array.from(selectedIds)}
        messages={messages}
        onSuccess={() => {
          setSyncModalOpen(false);
          setSelectedIds(new Set());
        }}
      />
    </>
  );
}
