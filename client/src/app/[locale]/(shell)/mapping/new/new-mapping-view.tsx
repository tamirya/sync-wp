"use client";

import {
  expandedIdsForQuery,
  filterCategoryTree,
  filteredProductsForCategory,
  mappingStockDotKind,
  type MappingCategoryNode,
  type MappingProductRow,
} from "@/lib/mapping-tree-utils";
import type { Locale } from "@/i18n/config";
import type { AppMessages } from "@/messages/app";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  createCategoryRulesAction,
  createProductRulesAction,
} from "@/app/actions/mapping-rules";
import { MappingTreesLoadingIndicator } from "../mapping-loading-indicator";

type NamedEntity = { id: string; name: string };
type AddMode = "category" | "product";

type DraftSource = {
  type: "category" | "product";
  id: number;
  name: string;
};

type FlatCategory = {
  id: number;
  name: string;
  depth: number;
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
/*  Tree utils                                                          */
/* ------------------------------------------------------------------ */

function flattenCategoryTree(
  nodes: MappingCategoryNode[],
  depth = 0,
): FlatCategory[] {
  const result: FlatCategory[] = [];
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, depth });
    result.push(...flattenCategoryTree(node.children, depth + 1));
  }
  return result;
}

function mappingProductStockLabel(
  p: MappingProductRow,
  m: AppMessages,
): string {
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

/* ------------------------------------------------------------------ */
/*  Shared icons                                                        */
/* ------------------------------------------------------------------ */

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={`h-4 w-4 shrink-0 text-muted transition-transform duration-150 ${
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

/* ------------------------------------------------------------------ */
/*  StoreCategoryPicker — flat searchable dropdown                     */
/* ------------------------------------------------------------------ */

function StoreCategoryPicker({
  flatCategories,
  selectedId,
  onSelect,
  messages,
  dir,
}: {
  flatCategories: FlatCategory[];
  selectedId: number | null;
  onSelect: (id: number, name: string) => void;
  messages: AppMessages;
  dir: "rtl" | "ltr";
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = flatCategories.find((c) => c.id === selectedId);

  const filtered = useMemo(() => {
    if (!query) return flatCategories;
    const q = query.toLowerCase();
    return flatCategories.filter((c) => c.name.toLowerCase().includes(q));
  }, [flatCategories, query]);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <div ref={wrapRef} className="relative" dir={dir}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full rounded-xl border px-3 py-2.5 text-sm text-start transition focus:outline-none focus:ring-2 focus:ring-ring/40 ${
          selectedId
            ? "border-primary/40 bg-primary/5 font-medium text-primary"
            : "border-border bg-muted-bg/60 text-muted"
        }`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="truncate">
            {selected ? selected.name : messages.mappingDraftSelectTarget}
          </span>
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {open && (
        <div className="absolute start-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-xl ring-1 ring-black/5">
          <div className="border-b border-border/60 p-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={messages.mappingDraftSearchTarget}
              className="w-full rounded-lg border border-border bg-muted-bg px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto overscroll-contain py-1">
            {filtered.map((cat) => (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(cat.id, cat.name);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center gap-2 py-2 pe-3 text-sm transition hover:bg-muted-bg ${
                    selectedId === cat.id
                      ? "bg-primary/8 font-semibold text-primary"
                      : "text-foreground"
                  }`}
                  style={{ paddingInlineStart: `${cat.depth * 12 + 12}px` }}
                >
                  {selectedId === cat.id && <CheckIcon />}
                  {cat.name}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-muted">
                {messages.mappingDraftTargetSearchNoResults}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Rule Builder Sidebar                                                */
/* ------------------------------------------------------------------ */

function RuleBuilderSidebar({
  addMode,
  sources,
  targetId,
  targetName,
  flatStoreCategories,
  onRemoveSource,
  onSelectTarget,
  onSave,
  onReset,
  isSaving,
  saveError,
  saveSuccess,
  messages,
  dir,
  canSave,
  hasBothSelected,
}: {
  addMode: AddMode;
  sources: DraftSource[];
  targetId: number | null;
  targetName: string;
  flatStoreCategories: FlatCategory[];
  onRemoveSource: (id: number, type: DraftSource["type"]) => void;
  onSelectTarget: (id: number, name: string) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  messages: AppMessages;
  dir: "rtl" | "ltr";
  canSave: boolean;
  hasBothSelected: boolean;
}) {
  return (
    <aside
      dir={dir}
      className="flex w-72 shrink-0 flex-col gap-3 lg:sticky lg:top-6 lg:self-start"
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted-bg/40 px-4 py-3">
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
          <h2 className="text-sm font-bold text-foreground">
            {messages.mappingDraftTitle}
          </h2>
          {sources.length > 0 && (
            <span className="ms-auto rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
              {sources.length}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-0">
          {/* Sources section */}
          <div className="p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
              {messages.mappingDraftSources}
            </p>
            {sources.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted-bg/30 px-3 py-4 text-center text-xs text-muted">
                {hasBothSelected
                  ? messages.mappingDraftSourcesEmpty
                  : messages.mappingSelectBothHint}
              </div>
            ) : (
              <ul className="space-y-1.5">
                {sources.map((s) => (
                  <li
                    key={`${s.type}-${s.id}`}
                    className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs ring-1 ring-amber-200/60 dark:bg-amber-950/20 dark:ring-amber-800/30"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                      aria-hidden
                    >
                      {s.type === "category" ? (
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                      ) : (
                        <path
                          fillRule="evenodd"
                          d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z"
                          clipRule="evenodd"
                        />
                      )}
                    </svg>
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                      {s.name}
                    </span>
                    <button
                      type="button"
                      aria-label={messages.mappingDraftRemoveAriaLabel}
                      onClick={() => onRemoveSource(s.id, s.type)}
                      className="shrink-0 rounded-md text-muted transition hover:text-destructive focus:outline-none"
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
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Arrow divider */}
          <div className="flex items-center gap-2 px-4 py-1">
            <div className="h-px flex-1 bg-border/60" />
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 shrink-0 text-muted"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v10.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="h-px flex-1 bg-border/60" />
          </div>

          {/* Target section */}
          <div className="p-3 pt-1">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
              {messages.mappingDraftTarget}
            </p>
            {hasBothSelected ? (
              <StoreCategoryPicker
                flatCategories={flatStoreCategories}
                selectedId={targetId}
                onSelect={onSelectTarget}
                messages={messages}
                dir={dir}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted-bg/30 px-3 py-4 text-center text-xs text-muted">
                {messages.mappingSelectBothHint}
              </div>
            )}
          </div>

          {/* Feedback */}
          {saveError && (
            <div className="mx-3 mb-2 rounded-lg border border-destructive/30 bg-destructive-muted px-3 py-2 text-xs text-destructive">
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="mx-3 mb-2 rounded-lg border border-emerald-500/30 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              {messages.mappingNewSaveSuccess}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 p-3 pt-0">
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave || isSaving || saveSuccess}
              title={
                sources.length === 0
                  ? messages.mappingDraftSourcesEmpty
                  : !targetId
                    ? messages.mappingDraftNoTarget
                    : undefined
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
                messages.mappingDraftSaveRule
              )}
            </button>
            <button
              type="button"
              onClick={onReset}
              disabled={isSaving}
              className="w-full rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-muted transition hover:bg-muted-bg hover:text-foreground disabled:opacity-50"
            >
              {messages.mappingDraftResetRule}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Supplier tree components (with + buttons)                          */
/* ------------------------------------------------------------------ */

function ProductRowWithAdd({
  product,
  messages,
  isInDraft,
  onAdd,
}: {
  product: MappingProductRow;
  messages: AppMessages;
  isInDraft: boolean;
  onAdd: (id: number, name: string) => void;
}) {
  const stockDot = mappingStockDotKind(product);
  return (
    <li className="flex items-start gap-2 rounded-lg py-2 ps-2 text-sm leading-snug text-muted hover:bg-muted-bg/60">
      <button
        type="button"
        aria-label={messages.mappingDraftAddAriaLabel}
        onClick={() => onAdd(product.id, product.name)}
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition ${
          isInDraft
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card text-muted hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
        }`}
      >
        {isInDraft ? <CheckIcon /> : <PlusIcon />}
      </button>
      <span className="min-w-0 flex-1">
        <span className="text-foreground">{product.name}</span>
        <span className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted">
          {product.sku ? (
            <span>
              · {messages.mappingProductSku}: {product.sku}
            </span>
          ) : null}
          <span>
            · {messages.mappingProductPrice}:{" "}
            {product.regularPrice ??
              product.price ??
              messages.mappingProductFieldEmpty}
          </span>
          <span className="inline-flex items-center gap-1">
            {stockDot === "in" ? (
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                aria-hidden
              />
            ) : stockDot === "out" ? (
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-red-500"
                aria-hidden
              />
            ) : null}
            · {messages.mappingProductStock}:{" "}
            {mappingProductStockLabel(product, messages)}
          </span>
        </span>
      </span>
    </li>
  );
}

function SupplierCategoryNodeRow({
  node,
  depth,
  products,
  open,
  toggle,
  messages,
  addMode,
  draftIds,
  onAdd,
  query,
}: {
  node: MappingCategoryNode;
  depth: number;
  products: MappingProductRow[];
  open: Set<number>;
  toggle: (id: number) => void;
  messages: AppMessages;
  addMode: AddMode;
  draftIds: Set<number>;
  onAdd: (id: number, name: string, type: DraftSource["type"]) => void;
  query: string;
}) {
  const expanded = open.has(node.id);
  const prods = filteredProductsForCategory(products, node.id, query);
  const pad = depth * 16;
  const displayCount = Math.max(node.count ?? 0, prods.length);
  const isInDraft = addMode === "category" && draftIds.has(node.id);

  return (
    <div className="select-none">
      <div
        className={`flex w-full items-center gap-2 rounded-lg py-1.5 text-base leading-snug transition ${
          isInDraft
            ? "bg-amber-50/60 dark:bg-amber-950/10"
            : "hover:bg-muted-bg/50"
        }`}
        style={{ paddingInlineStart: `${pad + 8}px`, paddingInlineEnd: "8px" }}
      >
        {/* Add/check button — only for category mode */}
        {addMode === "category" && (
          <button
            type="button"
            aria-label={messages.mappingDraftAddAriaLabel}
            onClick={() => onAdd(node.id, node.name, "category")}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition ${
              isInDraft
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
            }`}
          >
            {isInDraft ? <CheckIcon /> : <PlusIcon />}
          </button>
        )}

        {/* Expand button */}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-start"
          onClick={() => toggle(node.id)}
        >
          {(node.children.length > 0 || prods.length > 0) && (
            <Chevron expanded={expanded} />
          )}
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {node.name}
          </span>
          <span className="ms-1 shrink-0 text-xs text-muted">
            ({displayCount})
          </span>
        </button>
      </div>

      {expanded && (
        <div className="pb-1">
          {node.children.map((ch) => (
            <SupplierCategoryNodeRow
              key={ch.id}
              node={ch}
              depth={depth + 1}
              products={products}
              open={open}
              toggle={toggle}
              messages={messages}
              addMode={addMode}
              draftIds={draftIds}
              onAdd={onAdd}
              query={query}
            />
          ))}
          {/* Products — only shown in product mode */}
          {addMode === "product" && prods.length > 0 && (
            <ul
              className="mt-1 list-none space-y-0.5 border-s border-border/50"
              style={{ marginInlineStart: `${(depth + 1) * 16 + 8}px` }}
            >
              {prods.map((p) => (
                <ProductRowWithAdd
                  key={p.id}
                  product={p}
                  messages={messages}
                  isInDraft={draftIds.has(p.id)}
                  onAdd={(id, name) => onAdd(id, name, "product")}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SupplierTreePanel({
  roots,
  products,
  messages,
  addMode,
  draftIds,
  onAdd,
}: {
  roots: MappingCategoryNode[];
  products: MappingProductRow[];
  messages: AppMessages;
  addMode: AddMode;
  draftIds: Set<number>;
  onAdd: (id: number, name: string, type: DraftSource["type"]) => void;
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const hasRoots = roots.length > 0;
  const hasResults = filteredRoots.length > 0;

  return (
    <section
      className="flex min-h-0 w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      aria-label={messages.mappingPanelSupplier}
    >
      <div className="shrink-0 border-b border-border bg-gradient-to-b from-amber-500/15 to-transparent px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-foreground">
          {messages.mappingPanelSupplier}
        </h2>
      </div>

      {hasRoots && (
        <div className="shrink-0 border-b border-border/60 px-3 py-2">
          <div className="relative">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
              className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
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
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-2 [scrollbar-gutter:stable]">
        {!hasRoots ? (
          <p className="rounded-lg border border-dashed border-border/80 bg-muted-bg/40 px-3 py-6 text-center text-sm text-muted">
            {messages.mappingCategoriesEmpty}
          </p>
        ) : !hasResults ? (
          <p className="rounded-lg border border-dashed border-border/80 bg-muted-bg/40 px-3 py-6 text-center text-sm text-muted">
            {messages.mappingSearchNoResults}
          </p>
        ) : (
          <div className="space-y-0.5">
            {filteredRoots.map((node) => (
              <SupplierCategoryNodeRow
                key={node.id}
                node={node}
                depth={0}
                products={products}
                open={effectiveOpen}
                toggle={toggle}
                messages={messages}
                addMode={addMode}
                draftIds={draftIds}
                onAdd={onAdd}
                query={query}
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
  const dir: "rtl" | "ltr" = locale === "he" ? "rtl" : "ltr";
  const [isPending, startTransition] = useTransition();
  const [routeLoading, setRouteLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [draftSources, setDraftSources] = useState<DraftSource[]>([]);
  const [draftTargetId, setDraftTargetId] = useState<number | null>(null);
  const [draftTargetName, setDraftTargetName] = useState<string>("");

  useEffect(() => {
    setDraftSources([]);
    setDraftTargetId(null);
    setDraftTargetName("");
    setRouteLoading(false);
    setSaveError(null);
    setSaveSuccess(false);
  }, [selectedStoreId, selectedSupplierId]);

  const flatStoreCategories = useMemo(
    () => flattenCategoryTree(storeTree),
    [storeTree],
  );

  const draftIds = useMemo(
    () => new Set(draftSources.map((s) => s.id)),
    [draftSources],
  );

  const handleAdd = useCallback(
    (id: number, name: string, type: DraftSource["type"]) => {
      setDraftSources((prev) => {
        const exists = prev.some((s) => s.id === id && s.type === type);
        if (exists) {
          return prev.filter((s) => !(s.id === id && s.type === type));
        }
        return [...prev, { id, name, type }];
      });
    },
    [],
  );

  const handleRemoveSource = useCallback(
    (id: number, type: DraftSource["type"]) => {
      setDraftSources((prev) =>
        prev.filter((s) => !(s.id === id && s.type === type)),
      );
    },
    [],
  );

  const handleSelectTarget = useCallback((id: number, name: string) => {
    setDraftTargetId(id);
    setDraftTargetName(name);
  }, []);

  const handleReset = useCallback(() => {
    setDraftSources([]);
    setDraftTargetId(null);
    setDraftTargetName("");
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  const onStoreChange = (value: string) => {
    setRouteLoading(true);
    pushNewMapping(router, locale, addMode, value, selectedSupplierId ?? "");
  };

  const onSupplierChange = (value: string) => {
    setRouteLoading(true);
    pushNewMapping(router, locale, addMode, selectedStoreId ?? "", value);
  };

  const bothSelected = Boolean(selectedStoreId && selectedSupplierId);
  const showTrees = !routeLoading && bothSelected && !catalogLoadFailed;

  const canSave =
    bothSelected && draftSources.length > 0 && draftTargetId !== null;

  const handleSave = () => {
    if (!selectedStoreId || !selectedSupplierId || !draftTargetId) return;
    setSaveError(null);
    const storeId = Number(selectedStoreId);
    const supplierId = Number(selectedSupplierId);
    const storeCategoryId = draftTargetId;

    startTransition(async () => {
      let result;
      if (addMode === "category") {
        const rules = draftSources.map((s) => ({
          storeId,
          supplierId,
          supplierCategoryId: s.id,
          storeCategoryId,
        }));
        result = await createCategoryRulesAction(locale, rules);
      } else {
        const rules = draftSources.map((s) => ({
          storeId,
          supplierId,
          sourceProductId: s.id,
          storeCategoryId,
        }));
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

  const isSaving = isPending;

  return (
    <div className="space-y-6" dir={dir}>
      {/* Store / Supplier selects */}
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

      {/* Loading */}
      {routeLoading && (
        <div className="rounded-xl border border-dashed border-border bg-muted-bg/40 px-4">
          <MappingTreesLoadingIndicator
            label={messages.mappingTreesLoading}
            minHeightClass="min-h-56"
          />
        </div>
      )}

      {/* Not both selected hint */}
      {!routeLoading && !bothSelected && (
        <p className="rounded-xl border border-dashed border-border bg-muted-bg/40 px-4 py-5 text-center text-sm text-muted">
          {messages.mappingSelectBothHint}
        </p>
      )}

      {/* Catalog load error */}
      {!routeLoading && bothSelected && catalogLoadFailed && (
        <p className="rounded-xl border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive">
          {messages.mappingCatalogLoadError}
        </p>
      )}

      {/* Main layout: sidebar + tree */}
      {showTrees && (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Rule builder sidebar */}
          <RuleBuilderSidebar
            addMode={addMode}
            sources={draftSources}
            targetId={draftTargetId}
            targetName={draftTargetName}
            flatStoreCategories={flatStoreCategories}
            onRemoveSource={handleRemoveSource}
            onSelectTarget={handleSelectTarget}
            onSave={handleSave}
            onReset={handleReset}
            isSaving={isSaving}
            saveError={saveError}
            saveSuccess={saveSuccess}
            messages={messages}
            dir={dir}
            canSave={canSave}
            hasBothSelected={bothSelected}
          />

          {/* Supplier tree */}
          <div
            className="min-w-0 flex-1"
            style={{ minHeight: "min(70vh, 40rem)" }}
          >
            <SupplierTreePanel
              roots={supplierTree}
              products={supplierProducts}
              messages={messages}
              addMode={addMode}
              draftIds={draftIds}
              onAdd={handleAdd}
            />
          </div>
        </div>
      )}

      {/* Bottom action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/mapping`)}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted-bg disabled:opacity-60"
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4 rtl:rotate-180"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          {messages.mappingBackToList}
        </button>
      </div>
    </div>
  );
}
