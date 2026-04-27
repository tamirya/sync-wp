"use client";

import { useState } from "react";
import Link from "next/link";
import {
  SyncToStoreModal,
  type SyncToStoreModalMessages,
} from "@/components/sync-to-store-modal";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type CategoryImage = { src?: string | null; alt?: string | null };

export type ClientCategory = {
  id: number;
  name: string;
  parent: number;
  count?: number;
  image?: CategoryImage | null;
  images?: CategoryImage[] | null;
};

export type ClientProduct = {
  id: number;
  price: string | null;
  regularPrice: string | null;
  categories: { id: number }[];
};

type Messages = {
  storeCategoryProducts: string;
  storeCategoryRoot: string;
  storeCategoryParent: string;
  selectLabel: string;
  selectedLabel: string;
  selectionTotal: string;
  selectionClear: string;
  syncToStoreButton: string;
} & SyncToStoreModalMessages;

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
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
/*  Client Component                                                    */
/* ------------------------------------------------------------------ */
export function SupplierCategoriesClient({
  rootCategories,
  products,
  messages,
  locale,
  supplierId,
  nameById,
  totalCountMap,
}: {
  rootCategories: ClientCategory[];
  products: ClientProduct[];
  messages: Messages;
  locale: string;
  supplierId: string;
  nameById: Record<number, string>;
  totalCountMap: Record<number, number>;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function categoryTotal(catId: number): number {
    return products
      .filter((p) => p.categories.some((c) => c.id === catId))
      .reduce((sum, p) => sum + parsePrice(p.price ?? p.regularPrice), 0);
  }

  const selectedCategories = rootCategories.filter((c) =>
    selectedIds.has(c.id),
  );
  const grandTotal = selectedCategories.reduce(
    (sum, c) => sum + categoryTotal(c.id),
    0,
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rootCategories.map((cat) => {
          const isSelected = selectedIds.has(cat.id);
          const imgSrc =
            cat.image?.src ??
            (Array.isArray(cat.images) ? cat.images[0]?.src : null) ??
            null;
          const imgAlt =
            cat.image?.alt ??
            (Array.isArray(cat.images) ? cat.images[0]?.alt : null) ??
            cat.name;
          const count = totalCountMap[cat.id] ?? cat.count ?? null;
          const parentName =
            cat.parent !== 0 ? (nameById[cat.parent] ?? null) : null;
          const isRoot = cat.parent === 0;
          const gradient = CARD_GRADIENTS[cat.id % CARD_GRADIENTS.length];

          return (
            <div
              key={cat.id}
              className={`group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                isSelected
                  ? "border-primary/70 ring-2 ring-primary/20"
                  : "border-border/60 hover:border-primary/30"
              }`}
            >
              {/* Gradient thumbnail (links to category page) */}
              <Link
                href={`/${locale}/suppliers/${supplierId}/categories/${cat.id}`}
                className={`relative block h-32 w-full shrink-0 overflow-hidden bg-gradient-to-br ${gradient}`}
              >
                {/* Decorative circles */}
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
                      className="h-12 w-12 opacity-90 drop-shadow-sm"
                      aria-hidden
                    >
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                )}

                {/* Root / sub badge on image */}
                <span className="absolute left-2.5 top-2.5 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                  {isRoot
                    ? messages.storeCategoryRoot
                    : (parentName ?? messages.storeCategoryParent)}
                </span>
              </Link>

              {/* Body */}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <Link
                  href={`/${locale}/suppliers/${supplierId}/categories/${cat.id}`}
                >
                  <h3 className="line-clamp-1 text-sm font-bold text-card-foreground transition-colors hover:text-primary">
                    {cat.name}
                  </h3>
                </Link>

                <div className="flex items-center justify-between">
                  {count !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-primary leading-none">
                        {count.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-muted">
                        {messages.storeCategoryProducts}
                      </span>
                    </div>
                  ) : (
                    <span />
                  )}
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-white">
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
                  </div>
                </div>

                {/* Select button — pinned to bottom */}
                <button
                  onClick={() => toggle(cat.id)}
                  className={`mt-auto w-full rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-primary text-white shadow-sm hover:bg-primary/90"
                      : "border border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                  }`}
                >
                  {isSelected ? messages.selectedLabel : messages.selectLabel}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom selection bar */}
      {selectedIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-card/95 shadow-[0_-4px_24px_rgba(0,0,0,0.10)] backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 py-4">
            {/* Selected category chips */}
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {selectedCategories.map((c) => {
                const total = categoryTotal(c.id);
                const count = totalCountMap[c.id] ?? null;
                return (
                  <span
                    key={c.id}
                    className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                  >
                    <span className="max-w-[140px] truncate">{c.name}</span>
                    {count !== null && (
                      <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold">
                        {count}
                      </span>
                    )}
                    {total > 0 && (
                      <span className="text-primary/70">
                        {formatTotal(total)}
                      </span>
                    )}
                    <button
                      onClick={() => toggle(c.id)}
                      className="ml-0.5 text-primary/60 transition-colors hover:text-primary"
                      aria-label="הסר קטגוריה"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
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
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden
                >
                  <path d="M1 4v6h6" />
                  <path d="M23 20v-6h-6" />
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
                </svg>
                {messages.syncToStoreButton}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
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
        supplierId={Number(supplierId)}
        selectedCategoryIds={Array.from(selectedIds)}
        selectedProductIds={[]}
        messages={messages}
        onSuccess={() => {
          setSyncModalOpen(false);
          setSelectedIds(new Set());
        }}
      />
    </>
  );
}
