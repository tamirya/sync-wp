"use client";

import { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type PanelCategory = {
  id: number;
  name: string;
  displayCount?: number | null;
  parentName?: string;
};

export type PanelProduct = {
  id: number;
  name: string;
  sku?: string;
  price?: string | null;
  regularPrice?: string | null;
  parentName?: string;
};

export type SelectionSidePanelMessages = {
  panelTitle: string;
  panelCategoriesSection: string;
  panelProductsSection: string;
  panelEmpty: string;
  panelTotal: string;
  panelClear: string;
  panelSync: string;
};

type Props = {
  selectedCategories: PanelCategory[];
  selectedProducts: PanelProduct[];
  grandTotal: number;
  onToggleCategory: (id: number) => void;
  onToggleProduct: (id: number) => void;
  onClear: () => void;
  onSync: () => void;
  messages: SelectionSidePanelMessages;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatTotal(total: number): string {
  return (
    "₪" +
    total.toLocaleString("he-IL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

type GroupedItem =
  | { kind: "cat"; item: PanelCategory }
  | { kind: "prod"; item: PanelProduct };

type Group = {
  parentName: string | undefined;
  items: GroupedItem[];
};

function buildGroups(cats: PanelCategory[], prods: PanelProduct[]): Group[] {
  const map = new Map<string, GroupedItem[]>();
  const order: string[] = [];

  function key(name: string | undefined) {
    return name ?? "__none__";
  }

  for (const cat of cats) {
    const k = key(cat.parentName);
    if (!map.has(k)) {
      map.set(k, []);
      order.push(k);
    }
    map.get(k)!.push({ kind: "cat", item: cat });
  }
  for (const prod of prods) {
    const k = key(prod.parentName);
    if (!map.has(k)) {
      map.set(k, []);
      order.push(k);
    }
    map.get(k)!.push({ kind: "prod", item: prod });
  }

  return order.map((k) => ({
    parentName: k === "__none__" ? undefined : k,
    items: map.get(k)!,
  }));
}

/* ------------------------------------------------------------------ */
/*  Icons                                                               */
/* ------------------------------------------------------------------ */

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M3 3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H8.5L7 3H3z" />
    </svg>
  );
}

function ProductIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden
    >
      <rect x="2" y="2" width="12" height="12" rx="1.5" />
      <circle cx="5.5" cy="5.5" r="1" fill="currentColor" stroke="none" />
      <path d="M14 10 10 6 2 14" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function SelectionSidePanel({
  selectedCategories,
  selectedProducts,
  grandTotal,
  onToggleCategory,
  onToggleProduct,
  onClear,
  onSync,
  messages,
}: Props) {
  const [open, setOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(
    new Set(),
  );
  const panelRef = useRef<HTMLDivElement>(null);

  const totalCount = selectedCategories.length + selectedProducts.length;
  const anySelected = totalCount > 0;

  function toggleGroupCollapse(gi: number) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(gi) ? next.delete(gi) : next.add(gi);
      return next;
    });
  }

  /* auto-open when first item is selected */
  useEffect(() => {
    if (anySelected) setOpen(true);
  }, [anySelected]);

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  if (!anySelected && !open) return null;

  const groups = buildGroups(selectedCategories, selectedProducts);

  return (
    <div
      ref={panelRef}
      className="fixed bottom-0 left-0 top-0 z-50 flex items-stretch"
      dir="rtl"
      aria-label={messages.panelTitle}
    >
      {/* ── Panel body ────────────────────────────────────────────── */}
      <div
        className={`h-full w-72 flex-col overflow-hidden border-r border-border bg-card shadow-[4px_0_24px_rgba(0,0,0,0.10)] ${open ? "flex" : "hidden"}`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-muted-bg/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4 shrink-0 text-primary"
              aria-hidden
            >
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path
                fillRule="evenodd"
                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm2 0a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm4-1a1 1 0 100 2h.01a1 1 0 100-2H13z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-bold text-foreground">
              {messages.panelTitle}
            </span>
            {totalCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                {totalCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition hover:bg-muted-bg hover:text-foreground"
            aria-label="סגור"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* ── Tree list ─────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-gutter:stable]">
          {!anySelected ? (
            <p className="mt-4 rounded-xl border border-dashed border-border/70 bg-muted-bg/30 px-3 py-8 text-center text-xs text-muted">
              {messages.panelEmpty}
            </p>
          ) : (
            <ul className="space-y-4">
              {groups.map((group, gi) => {
                const collapsed = collapsedGroups.has(gi);
                return (
                  <li key={gi}>
                    {/* Root node — clickable header with collapse arrow */}
                    <button
                      type="button"
                      onClick={() => toggleGroupCollapse(gi)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted-bg/60"
                    >
                      <FolderIcon className="h-4 w-4 shrink-0 text-amber-500" />
                      <span className="flex-1 truncate text-right text-xs font-bold text-foreground">
                        {group.parentName ?? messages.panelCategoriesSection}
                      </span>
                      <span className="shrink-0 rounded-full bg-border/50 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                        {group.items.length}
                      </span>
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-150 ${collapsed ? "rotate-90" : ""}`}
                        aria-hidden
                      >
                        <path
                          d="M4 6l4 4 4-4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {/* Children — tree lines, hidden when collapsed */}
                    <ul
                      className={`relative mr-[9px] border-r border-border/40 ${collapsed ? "hidden" : ""}`}
                    >
                      {group.items.map((entry, idx) => {
                        const isLast = idx === group.items.length - 1;

                        const sharedLi = "relative";
                        /* horizontal branch connector */
                        const branch = (
                          <span
                            className="pointer-events-none absolute right-0 top-[14px] h-px w-4 bg-border/40"
                            aria-hidden
                          />
                        );
                        /* white overlay to clip the vertical line after the last item */
                        const clip = isLast ? (
                          <span
                            className="pointer-events-none absolute bottom-0 right-[-1px] top-[14px] w-[2px] bg-card"
                            aria-hidden
                          />
                        ) : null;

                        if (entry.kind === "cat") {
                          const cat = entry.item;
                          return (
                            <li key={`cat-${cat.id}`} className={sharedLi}>
                              {branch}
                              {clip}
                              <label className="flex cursor-pointer items-center gap-2 rounded-lg py-1.5 pe-2 ps-6 hover:bg-muted-bg/70">
                                <input
                                  type="checkbox"
                                  checked
                                  onChange={() => onToggleCategory(cat.id)}
                                  className="h-3.5 w-3.5 shrink-0 rounded accent-primary"
                                />
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-50 ring-1 ring-amber-200">
                                  <FolderIcon className="h-3 w-3 text-amber-500" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[11px] font-semibold text-foreground">
                                    {cat.name}
                                  </span>
                                  {cat.displayCount != null && (
                                    <span className="text-[10px] text-muted">
                                      {cat.displayCount} פריטים
                                    </span>
                                  )}
                                </span>
                              </label>
                            </li>
                          );
                        } else {
                          const prod = entry.item;
                          return (
                            <li key={`prod-${prod.id}`} className={sharedLi}>
                              {branch}
                              {clip}
                              <label className="flex cursor-pointer items-center gap-2 rounded-lg py-1.5 pe-2 ps-6 hover:bg-muted-bg/70">
                                <input
                                  type="checkbox"
                                  checked
                                  onChange={() => onToggleProduct(prod.id)}
                                  className="h-3.5 w-3.5 shrink-0 rounded accent-primary"
                                />
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 ring-1 ring-primary/20">
                                  <ProductIcon className="h-3 w-3 text-primary" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[11px] font-semibold text-foreground">
                                    {prod.name}
                                  </span>
                                  {(prod.price ?? prod.regularPrice) && (
                                    <span className="text-[10px] font-medium text-primary/80">
                                      {prod.price ?? prod.regularPrice}
                                    </span>
                                  )}
                                </span>
                              </label>
                            </li>
                          );
                        }
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {anySelected && (
          <div className="shrink-0 space-y-2 border-t border-border/60 p-3">
            {grandTotal > 0 && (
              <div className="flex items-center justify-between px-1 text-sm">
                <span className="text-muted">{messages.panelTotal}</span>
                <span className="font-bold text-foreground">
                  {formatTotal(grandTotal)}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={onSync}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4 shrink-0"
                aria-hidden
              >
                <path d="M1 4v6h6" />
                <path d="M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
              </svg>
              {messages.panelSync}
            </button>
            <button
              type="button"
              onClick={onClear}
              className="w-full rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-muted transition hover:border-destructive/40 hover:text-destructive"
            >
              {messages.panelClear}
            </button>
          </div>
        )}
      </div>

      {/* ── Toggle tab ────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`absolute -right-9 top-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-r-xl border border-l-0 border-border bg-card shadow-md hover:bg-muted-bg ${open ? "hidden" : "flex h-16 w-9"}`}
        aria-label={messages.panelTitle}
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4 text-primary"
          aria-hidden
        >
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
          <path
            fillRule="evenodd"
            d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9 4a1 1 0 10-2 0v3a1 1 0 102 0V9zm-3 0a1 1 0 10-2 0v3a1 1 0 102 0V9z"
            clipRule="evenodd"
          />
        </svg>
        {totalCount > 0 && (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground leading-none">
            {totalCount}
          </span>
        )}
      </button>
    </div>
  );
}
