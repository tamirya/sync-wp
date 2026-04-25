"use client";

import {
  categorySubtreeSelectionState,
  collectDescendantCategoryIds,
  collectProductIdsInCategorySubtree,
  expandedIdsForQuery,
  filterCategoryTree,
  filteredProductsForCategory,
  mappingStockDotKind,
  type CategorySubtreeSelection,
  type MappingCategoryNode,
  type MappingProductRow,
} from "@/lib/mapping-tree-utils";
import type { Locale } from "@/i18n/config";
import type { AppMessages } from "@/messages/app";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  createCategoryRulesAction,
  createProductRulesAction,
} from "@/app/actions/mapping-rules";
import { MappingTreesLoadingIndicator } from "../mapping-loading-indicator";

type NamedEntity = { id: string; name: string };
type AddMode = "category" | "product";
type SelectionMode = "full" | "categoryOnly" | "productsOnly";

type PanelSelection = {
  categories: Set<number>;
  products: Set<number>;
};

type Props = {
  locale: Locale;
  messages: AppMessages;
  addMode: AddMode;
  stores: NamedEntity[];
  suppliers: NamedEntity[];
  selectedStoreId: string | null;
  selectedSupplierId: string | null;
  storeTree: MappingCategoryNode[];
  storeProducts: MappingProductRow[];
  supplierTree: MappingCategoryNode[];
  supplierProducts: MappingProductRow[];
  catalogLoadFailed: boolean;
};

/* ------------------------------------------------------------------ */
/*  URL helpers                                                         */
/* ------------------------------------------------------------------ */

function pushNewMapping(
  router: ReturnType<typeof useRouter>,
  locale: Locale,
  addMode: AddMode,
  store: string,
  supplier: string,
) {
  const q = new URLSearchParams();
  q.set("type", addMode);
  if (store) q.set("store", store);
  if (supplier) q.set("supplier", supplier);
  router.push(`/${locale}/mapping/new?${q.toString()}`);
}

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                      */
/* ------------------------------------------------------------------ */

function mappingProductStockLabel(p: MappingProductRow, m: AppMessages): string {
  const avail = p.stockAvailabilityText?.trim();
  if (avail) return avail;
  if (p.stockQuantity !== null && Number.isFinite(p.stockQuantity)) {
    return String(p.stockQuantity);
  }
  switch (p.stockStatus) {
    case "instock":
      return m.mappingStockInStock;
    case "outofstock":
      return m.mappingStockOutOfStock;
    case "onbackorder":
      return m.mappingStockOnBackorder;
    default:
      return p.stockStatus?.trim() || m.mappingProductFieldEmpty;
  }
}

function toggleProductInPanel(
  setter: Dispatch<SetStateAction<PanelSelection>>,
  productId: number,
) {
  setter((prev) => {
    const nextProd = new Set(prev.products);
    if (nextProd.has(productId)) {
      nextProd.delete(productId);
    } else {
      nextProd.add(productId);
    }
    return { categories: prev.categories, products: nextProd };
  });
}

function toggleCategorySubtreeInPanel(
  setter: Dispatch<SetStateAction<PanelSelection>>,
  node: MappingCategoryNode,
  catalogProducts: MappingProductRow[],
  mode: SelectionMode = "full",
) {
  setter((prev) => {
    const state = categorySubtreeSelectionState(
      node,
      prev.categories,
      prev.products,
      catalogProducts,
    );
    const catIds = collectDescendantCategoryIds(node);
    const prodIds = collectProductIdsInCategorySubtree(node, catalogProducts);
    const nextCat = new Set(prev.categories);
    const nextProd = new Set(prev.products);
    if (state === "all") {
      if (mode !== "productsOnly") {
        for (const id of catIds) nextCat.delete(id);
      }
      for (const id of prodIds) nextProd.delete(id);
    } else {
      if (mode !== "productsOnly") {
        for (const id of catIds) nextCat.add(id);
      }
      for (const id of prodIds) nextProd.add(id);
    }
    return { categories: nextCat, products: nextProd };
  });
}

/* ------------------------------------------------------------------ */
/*  Tree sub-components                                                 */
/* ------------------------------------------------------------------ */

function CategorySubtreeCheckbox({
  ariaLabel,
  state,
  onToggle,
}: {
  ariaLabel: string;
  state: CategorySubtreeSelection;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.indeterminate = state === "some";
  }, [state]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === "all"}
      onChange={onToggle}
      onClick={(e) => e.stopPropagation()}
      className="mt-1.5 h-5 w-5 shrink-0 rounded border-border accent-primary"
      aria-label={ariaLabel}
    />
  );
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={`h-5 w-5 shrink-0 text-muted transition-transform duration-150 rtl:-scale-x-100 ${
        expanded ? "rotate-90" : ""
      }`}
    >
      <path
        fillRule="evenodd"
        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ProductRows({
  products,
  depth,
  messages,
  selectedProducts,
  onToggleProduct,
  priceColumn,
}: {
  products: MappingProductRow[];
  depth: number;
  messages: AppMessages;
  selectedProducts: Set<number>;
  onToggleProduct: (id: number) => void;
  priceColumn: "current" | "regular";
}) {
  const pad = depth * 14;
  return (
    <ul
      className="list-none space-y-0.5 border-s border-border/60 ps-2"
      style={{ marginInlineStart: pad }}
    >
      {products.map((p) => {
        const stockDot = mappingStockDotKind(p);
        const displayPrice =
          priceColumn === "regular" ? (p.regularPrice ?? p.price) : p.price;
        return (
          <li
            key={p.id}
            className="flex items-start gap-2 rounded-md py-2 ps-2 text-base leading-snug text-muted hover:bg-muted-bg/60"
          >
            <input
              type="checkbox"
              checked={selectedProducts.has(p.id)}
              onChange={() => onToggleProduct(p.id)}
              className="mt-1 h-5 w-5 shrink-0 rounded border-border accent-primary"
              aria-label={p.name}
            />
            <span className="min-w-0 flex-1">
              <span className="text-foreground">{p.name}</span>
              <span className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-sm text-muted">
                {p.sku ? (
                  <span>
                    · {messages.mappingProductSku}: {p.sku}
                  </span>
                ) : null}
                <span>
                  · {messages.mappingProductPrice}:{" "}
                  {displayPrice ?? messages.mappingProductFieldEmpty}
                </span>
                <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  {stockDot === "in" ? (
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 shadow-sm"
                      title={messages.mappingStockInStock}
                      aria-hidden
                    />
                  ) : stockDot === "out" ? (
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 shadow-sm"
                      title={messages.mappingStockOutOfStock}
                      aria-hidden
                    />
                  ) : null}
                  <span>
                    · {messages.mappingProductStock}:{" "}
                    {mappingProductStockLabel(p, messages)}
                  </span>
                </span>
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function CategoryNodeRow({
  node,
  depth,
  products,
  open,
  toggle,
  messages,
  selectedCategories,
  onToggleCategoryNode,
  selectedProducts,
  onToggleProduct,
  priceColumn,
  query,
  selectionMode,
}: {
  node: MappingCategoryNode;
  depth: number;
  products: MappingProductRow[];
  open: Set<number>;
  toggle: (id: number) => void;
  messages: AppMessages;
  selectedCategories: Set<number>;
  onToggleCategoryNode: (node: MappingCategoryNode) => void;
  selectedProducts: Set<number>;
  onToggleProduct: (id: number) => void;
  priceColumn: "current" | "regular";
  query: string;
  selectionMode: SelectionMode;
}) {
  const expanded = open.has(node.id);
  const prods = filteredProductsForCategory(products, node.id, query);
  const pad = depth * 14;
  const displayCount = Math.max(node.count ?? 0, prods.length);
  const subtreeState = categorySubtreeSelectionState(
    node,
    selectedCategories,
    selectedProducts,
    products,
  );

  return (
    <div className="select-none">
      <div
        className="flex w-full items-start gap-2 rounded-lg py-2 text-start text-base leading-snug text-foreground"
        style={{ paddingInlineStart: pad }}
      >
        <CategorySubtreeCheckbox
          ariaLabel={node.name}
          state={subtreeState}
          onToggle={() => onToggleCategoryNode(node)}
        />
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-2 rounded-md text-start transition hover:bg-muted-bg/80"
          onClick={() => toggle(node.id)}
        >
          <span className="mt-0.5">
            <Chevron expanded={expanded} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-medium">{node.name}</span>
            <span className="ms-1.5 font-bold text-muted">({displayCount})</span>
          </span>
        </button>
      </div>
      {expanded ? (
        <div className="pb-1">
          {node.children.map((ch) => (
            <CategoryNodeRow
              key={ch.id}
              node={ch}
              depth={depth + 1}
              products={products}
              open={open}
              toggle={toggle}
              messages={messages}
              selectedCategories={selectedCategories}
              onToggleCategoryNode={onToggleCategoryNode}
              selectedProducts={selectedProducts}
              onToggleProduct={onToggleProduct}
              priceColumn={priceColumn}
              query={query}
              selectionMode={selectionMode}
            />
          ))}
          {prods.length > 0 && selectionMode !== "categoryOnly" ? (
            <ProductRows
              products={prods}
              depth={depth + 1}
              messages={messages}
              selectedProducts={selectedProducts}
              onToggleProduct={onToggleProduct}
              priceColumn={priceColumn}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CategoryTreePanel({
  title,
  accentClass,
  roots,
  products,
  messages,
  emptyLabel,
  selectedCategories,
  onToggleCategoryNode,
  selectedProducts,
  onToggleProduct,
  priceColumn,
  selectionMode = "full",
}: {
  title: string;
  accentClass: string;
  roots: MappingCategoryNode[];
  products: MappingProductRow[];
  messages: AppMessages;
  emptyLabel: string;
  selectedCategories: Set<number>;
  onToggleCategoryNode: (node: MappingCategoryNode) => void;
  selectedProducts: Set<number>;
  onToggleProduct: (id: number) => void;
  priceColumn: "current" | "regular";
  selectionMode?: SelectionMode;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<number>>(() => new Set());

  const filteredRoots = useMemo(
    () => filterCategoryTree(roots, products, query),
    [roots, products, query],
  );

  const autoExpanded = useMemo(
    () => expandedIdsForQuery(roots, products, query),
    [roots, products, query],
  );

  const effectiveOpen = useMemo<Set<number>>(() => {
    if (!query) return open;
    return new Set([...open, ...autoExpanded]);
  }, [open, autoExpanded, query]);

  const toggle = useCallback((id: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const hasRoots = roots.length > 0;
  const hasResults = filteredRoots.length > 0;

  return (
    <section
      className="flex max-h-[min(70vh,40rem)] min-h-0 w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      aria-label={title}
    >
      <div
        className={`shrink-0 border-b border-border bg-linear-to-b px-4 py-3 ${accentClass}`}
      >
        <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-foreground">
          {title}
        </h2>
      </div>
      {hasRoots ? (
        <div className="shrink-0 border-b border-border/60 px-3 py-2">
          <div className="relative">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
              className="pointer-events-none absolute inset-s-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            >
              <path
                fillRule="evenodd"
                d="M9 3a6 6 0 100 12A6 6 0 009 3zM1 9a8 8 0 1114.32 4.906l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387A8 8 0 011 9z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={messages.mappingSearchPlaceholder}
              className="w-full rounded-lg border border-border bg-muted-bg py-2 ps-8 pe-3 text-sm text-foreground placeholder:text-muted/70 focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-3 [scrollbar-gutter:stable]">
        {!hasRoots ? (
          <p className="rounded-lg border border-dashed border-border/80 bg-muted-bg/40 px-3 py-6 text-center text-sm text-muted">
            {emptyLabel}
          </p>
        ) : !hasResults ? (
          <p className="rounded-lg border border-dashed border-border/80 bg-muted-bg/40 px-3 py-6 text-center text-sm text-muted">
            {messages.mappingSearchNoResults}
          </p>
        ) : (
          <div className="space-y-0.5">
            {filteredRoots.map((node) => (
              <CategoryNodeRow
                key={node.id}
                node={node}
                depth={0}
                products={products}
                open={effectiveOpen}
                toggle={toggle}
                messages={messages}
                selectedCategories={selectedCategories}
                onToggleCategoryNode={onToggleCategoryNode}
                selectedProducts={selectedProducts}
                onToggleProduct={onToggleProduct}
                priceColumn={priceColumn}
                query={query}
                selectionMode={selectionMode}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export                                                         */
/* ------------------------------------------------------------------ */

export function NewMappingView({
  locale,
  messages,
  addMode,
  stores,
  suppliers,
  selectedStoreId,
  selectedSupplierId,
  storeTree,
  storeProducts,
  supplierTree,
  supplierProducts,
  catalogLoadFailed,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [routeLoading, setRouteLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [storeSelection, setStoreSelection] = useState<PanelSelection>(() => ({
    categories: new Set(),
    products: new Set(),
  }));
  const [supplierSelection, setSupplierSelection] = useState<PanelSelection>(
    () => ({ categories: new Set(), products: new Set() }),
  );

  useEffect(() => {
    setStoreSelection({ categories: new Set(), products: new Set() });
    setSupplierSelection({ categories: new Set(), products: new Set() });
    setRouteLoading(false);
    setSaveError(null);
    setSaveSuccess(false);
  }, [selectedStoreId, selectedSupplierId]);

  const toggleStoreCategory = useCallback(
    (node: MappingCategoryNode) => {
      const mode: SelectionMode =
        addMode === "product" ? "categoryOnly" : "full";
      toggleCategorySubtreeInPanel(setStoreSelection, node, storeProducts, mode);
    },
    [storeProducts, addMode],
  );

  const toggleSupplierCategory = useCallback(
    (node: MappingCategoryNode) => {
      const mode: SelectionMode =
        addMode === "product" ? "productsOnly" : "full";
      toggleCategorySubtreeInPanel(setSupplierSelection, node, supplierProducts, mode);
    },
    [supplierProducts, addMode],
  );

  const onStoreChange = (value: string) => {
    setRouteLoading(true);
    pushNewMapping(router, locale, addMode, value, selectedSupplierId ?? "");
  };

  const onSupplierChange = (value: string) => {
    setRouteLoading(true);
    pushNewMapping(router, locale, addMode, selectedStoreId ?? "", value);
  };

  const bothSelected = Boolean(selectedStoreId && selectedSupplierId);
  const showTrees =
    !routeLoading && bothSelected && !catalogLoadFailed;

  const storeOptions = useMemo(
    () =>
      stores.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      )),
    [stores],
  );

  const supplierOptions = useMemo(
    () =>
      suppliers.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      )),
    [suppliers],
  );

  /** Determine if there's a valid selection for saving */
  const hasSupplierSelection =
    addMode === "product"
      ? supplierSelection.products.size > 0
      : supplierSelection.categories.size > 0;
  const hasStoreSelection = storeSelection.categories.size > 0;
  const canSave = bothSelected && hasSupplierSelection && hasStoreSelection;

  const handleSave = () => {
    if (!selectedStoreId || !selectedSupplierId) return;
    setSaveError(null);
    const storeId = Number(selectedStoreId);
    const supplierId = Number(selectedSupplierId);

    startTransition(async () => {
      let result;
      if (addMode === "category") {
        const rules = [];
        for (const supplierCategoryId of supplierSelection.categories) {
          for (const storeCategoryId of storeSelection.categories) {
            rules.push({ storeId, supplierId, supplierCategoryId, storeCategoryId });
          }
        }
        result = await createCategoryRulesAction(locale, rules);
      } else {
        const rules = [];
        for (const sourceProductId of supplierSelection.products) {
          for (const storeCategoryId of storeSelection.categories) {
            rules.push({ storeId, supplierId, sourceProductId, storeCategoryId });
          }
        }
        result = await createProductRulesAction(locale, rules);
      }

      if (result.ok) {
        setSaveSuccess(true);
        setTimeout(() => {
          router.push(`/${locale}/mapping`);
        }, 800);
      } else {
        setSaveError(`${messages.mappingNewSaveFailed}: ${result.error}`);
      }
    });
  };

  const isSaving = isPending;

  return (
    <div className="space-y-6">
      {/* Store/Supplier selects */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted-bg/30 p-4 shadow-inner sm:flex-row sm:items-start sm:gap-6">
        <label className="block min-w-0 flex-1">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
            {messages.mappingSelectSupplier}
          </span>
          <select
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground shadow-sm focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-wait disabled:opacity-70"
            value={selectedSupplierId ?? ""}
            disabled={routeLoading || isSaving}
            onChange={(e) => onSupplierChange(e.target.value)}
          >
            <option value="">{messages.mappingSelectSupplier}</option>
            {supplierOptions}
          </select>
        </label>
        <label className="block min-w-0 flex-1">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
            {messages.mappingSelectStore}
          </span>
          <select
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground shadow-sm focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-wait disabled:opacity-70"
            value={selectedStoreId ?? ""}
            disabled={routeLoading || isSaving}
            onChange={(e) => onStoreChange(e.target.value)}
          >
            <option value="">{messages.mappingSelectStore}</option>
            {storeOptions}
          </select>
        </label>
      </div>

      {/* Loading indicator while route refetches */}
      {routeLoading ? (
        <div className="rounded-xl border border-dashed border-border bg-muted-bg/40 px-4">
          <MappingTreesLoadingIndicator
            label={messages.mappingTreesLoading}
            minHeightClass="min-h-56"
          />
        </div>
      ) : null}

      {/* Hint: select both */}
      {!routeLoading && !bothSelected ? (
        <p className="rounded-xl border border-dashed border-border bg-muted-bg/40 px-4 py-5 text-center text-sm text-muted">
          {messages.mappingSelectBothHint}
        </p>
      ) : null}

      {/* Catalog load error */}
      {!routeLoading && bothSelected && catalogLoadFailed ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive">
          {messages.mappingCatalogLoadError}
        </p>
      ) : null}

      {/* Trees */}
      {showTrees ? (
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="min-w-0 flex-1">
            <CategoryTreePanel
              title={messages.mappingPanelSupplier}
              accentClass="from-amber-500/15 to-transparent"
              roots={supplierTree}
              products={supplierProducts}
              messages={messages}
              emptyLabel={messages.mappingCategoriesEmpty}
              selectedCategories={supplierSelection.categories}
              onToggleCategoryNode={toggleSupplierCategory}
              selectedProducts={supplierSelection.products}
              onToggleProduct={(id) =>
                toggleProductInPanel(setSupplierSelection, id)
              }
              priceColumn="regular"
              selectionMode={addMode === "product" ? "productsOnly" : "full"}
            />
          </div>
          <div className="min-w-0 flex-1">
            <CategoryTreePanel
              title={messages.mappingPanelStore}
              accentClass="from-emerald-500/15 to-transparent"
              roots={storeTree}
              products={storeProducts}
              messages={messages}
              emptyLabel={messages.mappingCategoriesEmpty}
              selectedCategories={storeSelection.categories}
              onToggleCategoryNode={toggleStoreCategory}
              selectedProducts={storeSelection.products}
              onToggleProduct={(id) =>
                toggleProductInPanel(setStoreSelection, id)
              }
              priceColumn="current"
              selectionMode={addMode === "product" ? "categoryOnly" : "full"}
            />
          </div>
        </div>
      ) : null}

      {/* Error / success feedback */}
      {saveError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive">
          {saveError}
        </p>
      ) : null}

      {saveSuccess ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
          {messages.mappingNewSaveSuccess}
        </p>
      ) : null}

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/mapping`)}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted-bg disabled:opacity-60"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 rtl:rotate-180" aria-hidden>
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          {messages.mappingBackToList}
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || isSaving || saveSuccess}
          title={!canSave ? messages.mappingNewNoItemsSelected : undefined}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l3-3-3-3V0a12 12 0 00-12 12h4z"
                />
              </svg>
              {messages.mappingNewSaving}
            </>
          ) : (
            <>
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
                <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
              </svg>
              {messages.mappingAddMappingButton}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
