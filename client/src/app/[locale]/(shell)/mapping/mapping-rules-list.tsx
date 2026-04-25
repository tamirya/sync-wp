"use client";

import { useTransition, useState } from "react";
import type { Locale } from "@/i18n/config";
import type {
  MappingRule,
  ProductMappingRule,
  SupplierProductInfo,
} from "@/lib/mapping-api";
import type { AppMessages } from "@/messages/app";

type NamedEntity = { id: string; name: string };

type Props = {
  locale: Locale;
  rules: MappingRule[];
  loadFailed: boolean;
  productRules: ProductMappingRule[];
  productRulesLoadFailed: boolean;
  messages: AppMessages;
  stores: NamedEntity[];
  suppliers: NamedEntity[];
  storeCategoryMap: Record<number, string>;
  supplierCategoryMap: Record<number, string>;
  supplierCategoryCountMap: Record<number, number>;
  supplierProductMap: Record<number, SupplierProductInfo>;
  onDeleteCategoryRule?: (id: number) => void;
  onDeleteProductRule?: (id: number) => void;
  onToggleCategoryRule?: (id: number, enabled: boolean) => Promise<unknown>;
  onToggleProductRule?: (id: number, enabled: boolean) => Promise<unknown>;
  onAddCategoryRule?: () => void;
  onAddProductRule?: () => void;
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return iso;
  }
}

function dateRange(createdAt: string | null, updatedAt: string | null): string {
  const from = formatDate(createdAt);
  const to = formatDate(updatedAt);
  if (from && to && from !== to) return `${from} – ${to}`;
  return from || to || "";
}

/* ------------------------------------------------------------------ */
/*  Shared sub-components                                               */
/* ------------------------------------------------------------------ */

function SectionHeader({
  title,
  count,
  badge,
  onAdd,
  addLabel,
}: {
  title: string;
  count: number;
  badge: string;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      {count > 0 && (
        <span className="text-sm font-semibold text-primary">
          {badge.replace("{{count}}", count.toLocaleString())}
        </span>
      )}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="ms-auto flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-95"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden>
            <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
          </svg>
          {addLabel}
        </button>
      )}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  isPending,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  isPending?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={isPending}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-emerald-500" : "bg-border"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function DeleteButton({
  onClick,
  label,
  removeLabel,
  isPending,
}: {
  onClick: () => void;
  label: string;
  removeLabel: string;
  isPending?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-label={label}
      className="flex items-center gap-1 rounded-md bg-destructive px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-destructive/80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? (
        <svg
          className="h-3.5 w-3.5 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0" aria-hidden>
          <path
            fillRule="evenodd"
            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {removeLabel}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Category rule row                                                   */
/* ------------------------------------------------------------------ */

function CategoryRuleRow({
  rule,
  storeName,
  supplierName,
  supplierCategoryName,
  supplierCategoryCount,
  storeCategoryName,
  messages,
  onDelete,
  onToggle,
}: {
  rule: MappingRule;
  storeName: string;
  supplierName: string;
  supplierCategoryName: string;
  supplierCategoryCount: number | null;
  storeCategoryName: string;
  messages: AppMessages;
  onDelete?: (id: number) => void;
  onToggle?: (id: number, enabled: boolean) => Promise<unknown>;
}) {
  const [deletePending, startDeleteTransition] = useTransition();
  const [togglePending, startToggleTransition] = useTransition();
  const [enabled, setEnabled] = useState(rule.enabled);
  const range = dateRange(rule.createdAt, rule.updatedAt);

  function handleDelete() {
    if (!onDelete) return;
    startDeleteTransition(() => { onDelete(rule.id); });
  }

  function handleToggle(val: boolean) {
    setEnabled(val);
    startToggleTransition(async () => {
      await onToggle?.(rule.id, val);
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3.5 hover:bg-muted-bg/40">
      <ToggleSwitch checked={enabled} onChange={handleToggle} isPending={togglePending} />

      {/* Supplier side */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
          {supplierName}
        </span>
        <span className="text-sm font-semibold text-foreground">
          {supplierCategoryName}
          {supplierCategoryCount !== null && supplierCategoryCount > 0 && (
            <span className="ms-1.5 text-[11px] font-normal text-muted">
              ({supplierCategoryCount.toLocaleString()})
            </span>
          )}
        </span>
        {range && (
          <span className="text-[11px] text-muted">{range}</span>
        )}
      </div>

      <svg
        className="h-4 w-4 shrink-0 text-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>

      {/* Store side */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
          {storeName}
        </span>
        <span className="text-sm font-semibold text-foreground">
          {storeCategoryName}
        </span>
      </div>

      {onDelete && (
        <div className="flex shrink-0 items-center gap-1.5">
          <DeleteButton
            onClick={handleDelete}
            label={messages.mappingRuleDeleteAria}
            removeLabel={messages.mappingRuleRemoveLabel}
            isPending={deletePending}
          />
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  Product rule row                                                    */
/* ------------------------------------------------------------------ */

function ProductRuleRow({
  rule,
  storeName,
  supplierName,
  product,
  storeCategoryName,
  messages,
  onDelete,
  onToggle,
}: {
  rule: ProductMappingRule;
  storeName: string;
  supplierName: string;
  product: SupplierProductInfo | null;
  storeCategoryName: string;
  messages: AppMessages;
  onDelete?: (id: number) => void;
  onToggle?: (id: number, enabled: boolean) => Promise<unknown>;
}) {
  const [deletePending, startDeleteTransition] = useTransition();
  const [togglePending, startToggleTransition] = useTransition();
  const [enabled, setEnabled] = useState(rule.enabled);
  const range = dateRange(rule.createdAt, rule.updatedAt);
  const productName = product?.name ?? `#${rule.sourceProductId}`;
  const sku = product?.sku ?? "";
  const price = product?.price ?? null;

  function handleDelete() {
    if (!onDelete) return;
    startDeleteTransition(() => { onDelete(rule.id); });
  }

  function handleToggle(val: boolean) {
    setEnabled(val);
    startToggleTransition(async () => {
      await onToggle?.(rule.id, val);
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 hover:bg-muted-bg/40">
      <ToggleSwitch checked={enabled} onChange={handleToggle} isPending={togglePending} />

      {/* Supplier side */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
          {supplierName}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Product icon */}
          <svg
            className="h-3.5 w-3.5 shrink-0 text-primary/60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
          </svg>
          <span className="text-sm font-semibold text-foreground">
            {productName}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {sku && (
            <span className="rounded bg-muted-bg px-1.5 py-0.5 font-mono text-[11px] text-muted ring-1 ring-border/60">
              {messages.mappingProductSku}: {sku}
            </span>
          )}
          {price && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
              {messages.mappingProductPrice}: {price}
            </span>
          )}
          {range && (
            <span className="text-[11px] text-muted">{range}</span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <svg
        className="h-4 w-4 shrink-0 text-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>

      {/* Store side */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
          {storeName}
        </span>
        <div className="flex items-center gap-1.5">
          {/* Category / folder icon */}
          <svg
            className="h-3.5 w-3.5 shrink-0 text-amber-500/80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-sm font-semibold text-foreground">
            {storeCategoryName}
          </span>
        </div>
      </div>

      {onDelete && (
        <div className="flex shrink-0 items-center gap-1.5">
          <DeleteButton
            onClick={handleDelete}
            label={messages.mappingRuleDeleteAria}
            removeLabel={messages.mappingRuleRemoveLabel}
            isPending={deletePending}
          />
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export                                                         */
/* ------------------------------------------------------------------ */

export function MappingRulesList({
  rules,
  loadFailed,
  productRules,
  productRulesLoadFailed,
  messages,
  stores,
  suppliers,
  storeCategoryMap,
  supplierCategoryMap,
  supplierCategoryCountMap,
  supplierProductMap,
  onDeleteCategoryRule,
  onDeleteProductRule,
  onToggleCategoryRule,
  onToggleProductRule,
  onAddCategoryRule,
  onAddProductRule,
}: Props) {
  const storeMap = new Map(stores.map((s) => [Number(s.id), s.name]));
  const supplierMap = new Map(suppliers.map((s) => [Number(s.id), s.name]));

  const resolveName = (map: Map<number, string>, id: number) =>
    map.get(id) ?? `#${id}`;

  return (
    <div className="space-y-8">
      {/* ── Category mapping rules ── */}
      <section>
        <SectionHeader
          title={messages.mappingRulesTitle}
          count={rules.length}
          badge={messages.mappingRulesSyncedBadge}
          onAdd={onAddCategoryRule}
          addLabel={messages.mappingAddCategoryRule}
        />
        {loadFailed ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive">
            {messages.mappingRulesLoadError}
          </p>
        ) : rules.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted-bg/40 px-4 py-6 text-center text-sm text-muted">
            {messages.mappingRulesEmpty}
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <ul className="divide-y divide-border">
              {rules.map((rule) => (
                <CategoryRuleRow
                  key={rule.id}
                  rule={rule}
                  storeName={resolveName(storeMap, rule.storeId)}
                  supplierName={resolveName(supplierMap, rule.supplierId)}
                  supplierCategoryName={
                    supplierCategoryMap[rule.supplierCategoryId] ?? `#${rule.supplierCategoryId}`
                  }
                  supplierCategoryCount={
                    supplierCategoryCountMap[rule.supplierCategoryId] ?? null
                  }
                  storeCategoryName={
                    storeCategoryMap[rule.storeCategoryId] ?? `#${rule.storeCategoryId}`
                  }
                  messages={messages}
                  onDelete={onDeleteCategoryRule}
                  onToggle={onToggleCategoryRule}
                />
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ── Product mapping rules ── */}
      <section>
        <SectionHeader
          title={messages.mappingProductRulesTitle}
          count={productRules.length}
          badge={messages.mappingRulesSyncedBadge}
          onAdd={onAddProductRule}
          addLabel={messages.mappingAddProductRule}
        />
        {productRulesLoadFailed ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive">
            {messages.mappingProductRulesLoadError}
          </p>
        ) : productRules.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted-bg/40 px-4 py-6 text-center text-sm text-muted">
            {messages.mappingProductRulesEmpty}
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <ul className="divide-y divide-border">
              {productRules.map((rule) => (
                <ProductRuleRow
                  key={rule.id}
                  rule={rule}
                  storeName={resolveName(storeMap, rule.storeId)}
                  supplierName={resolveName(supplierMap, rule.supplierId)}
                  product={supplierProductMap[rule.sourceProductId] ?? null}
                  storeCategoryName={
                    storeCategoryMap[rule.storeCategoryId] ?? `#${rule.storeCategoryId}`
                  }
                  messages={messages}
                  onDelete={onDeleteProductRule}
                  onToggle={onToggleProductRule}
                />
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
