"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  SyncToStoreModal,
  type SyncToStoreModalMessages,
} from "@/components/sync-to-store-modal";
import {
  SelectionSidePanel,
  type PanelCategory,
} from "@/components/selection-side-panel";

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
/*  sessionStorage helpers                                              */
/* ------------------------------------------------------------------ */
type PersistedCatItem = PanelCategory;

function storageKey(supplierId: string) {
  return `supplier_sel_${supplierId}`;
}

function loadSelection(supplierId: string): PersistedCatItem[] {
  try {
    const raw = sessionStorage.getItem(storageKey(supplierId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { catItems?: PersistedCatItem[] };
    return parsed.catItems ?? [];
  } catch {
    return [];
  }
}

function saveSelection(supplierId: string, cats: PersistedCatItem[]) {
  try {
    const raw = sessionStorage.getItem(storageKey(supplierId));
    const existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    sessionStorage.setItem(
      storageKey(supplierId),
      JSON.stringify({ ...existing, catItems: cats }),
    );
  } catch {
    /* ignore */
  }
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
  /* IDs — for card highlight */
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  /* Full items — for panel display */
  const [panelCatItems, setPanelCatItems] = useState<PersistedCatItem[]>([]);

  /* Load persisted selection after hydration to avoid SSR mismatch */
  useEffect(() => {
    const cats = loadSelection(supplierId);
    setSelectedIds(new Set(cats.map((c) => c.id)));
    setPanelCatItems(cats);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId]);

  const [syncModalOpen, setSyncModalOpen] = useState(false);

  function toggle(id: number) {
    const isSelected = selectedIds.has(id);
    const nextIds = new Set(selectedIds);
    isSelected ? nextIds.delete(id) : nextIds.add(id);
    setSelectedIds(nextIds);

    let nextItems: PersistedCatItem[];
    if (isSelected) {
      nextItems = panelCatItems.filter((c) => c.id !== id);
    } else {
      const cat = rootCategories.find((c) => c.id === id);
      const count = totalCountMap[id] ?? cat?.count ?? null;
      nextItems = cat
        ? [...panelCatItems, { id, name: cat.name, displayCount: count }]
        : panelCatItems;
    }
    setPanelCatItems(nextItems);
    saveSelection(supplierId, nextItems);
  }

  function clearAll() {
    setSelectedIds(new Set());
    setPanelCatItems([]);
    saveSelection(supplierId, []);
  }

  /* grand total from products */
  function categoryTotal(catId: number): number {
    return products
      .filter((p) => p.categories.some((c) => c.id === catId))
      .reduce(
        (sum, p) =>
          sum +
          parseFloat(
            (p.price ?? p.regularPrice ?? "0").replace(/[^\d.]/g, "") || "0",
          ),
        0,
      );
  }

  const grandTotal = panelCatItems.reduce(
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

      {/* Floating selection side panel */}
      <SelectionSidePanel
        selectedCategories={panelCatItems}
        selectedProducts={[]}
        grandTotal={grandTotal}
        onToggleCategory={(id) => toggle(id)}
        onToggleProduct={() => {}}
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
        supplierId={Number(supplierId)}
        selectedCategoryIds={panelCatItems.map((c) => c.id)}
        selectedProductIds={[]}
        messages={messages}
        onSuccess={() => {
          setSyncModalOpen(false);
          clearAll();
        }}
      />
    </>
  );
}
