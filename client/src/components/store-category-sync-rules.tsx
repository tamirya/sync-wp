"use client";

import Link from "next/link";
import { useState } from "react";
import type { AppMessages } from "@/messages/app";
import { formatPriceOverrideLabel } from "@/lib/price-utils";
import type { StoreCategorySyncRuleRef } from "@/lib/store-category-sync-rules-parse";

export type { StoreCategorySyncRuleRef } from "@/lib/store-category-sync-rules-parse";
export { parseStoreCategorySyncRules } from "@/lib/store-category-sync-rules-parse";

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
        expanded ? "rotate-180" : ""
      }`}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function RuleTypeBadge({
  rule,
  messages,
}: {
  rule: StoreCategorySyncRuleRef;
  messages: AppMessages;
}) {
  const label =
    rule.type === "product"
      ? messages.storeProductSyncRuleProduct
      : messages.storeProductSyncRuleCategory;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
        rule.enabled
          ? "bg-primary/10 text-primary ring-primary/20"
          : "bg-muted-bg text-muted ring-border/60"
      }`}
      title={
        rule.enabled
          ? messages.storeProductSyncRuleActive
          : messages.storeProductSyncRuleDisabled
      }
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-3 w-3 shrink-0"
        aria-hidden
      >
        <path
          d="M8 1.5l1.2 2.4 2.7.4-2 1.9.5 2.7L8 7.8 5.6 8.9l.5-2.7-2-1.9 2.7-.4L8 1.5z"
          strokeLinejoin="round"
        />
      </svg>
      {label}
      {!rule.enabled ? ` (${messages.storeProductSyncRuleDisabledShort})` : ""}
    </span>
  );
}

function SyncRuleRow({
  rule,
  locale,
  messages,
}: {
  rule: StoreCategorySyncRuleRef;
  locale: string;
  messages: AppMessages;
}) {
  const sourceLabel =
    rule.type === "category"
      ? rule.supplierCategoryName ??
        (rule.supplierCategoryId != null
          ? `#${rule.supplierCategoryId}`
          : messages.storeCategorySyncSourceUnknown)
      : rule.sourceProductName ??
        (rule.sourceProductId != null
          ? `#${rule.sourceProductId}`
          : messages.storeCategorySyncSourceUnknown);

  const markupLabel =
    rule.pricingMode === "fixed_amount" || rule.fixedAmount != null
      ? formatPriceOverrideLabel({
          pricingMode: "fixed_amount",
          markupPercent: 0,
          fixedAmount: Number(rule.fixedAmount ?? 0),
          useSalePrices: rule.useSalePrices === true,
        })
      : rule.markupPercent != null
        ? formatPriceOverrideLabel({
            pricingMode: "percent",
            markupPercent: Number(rule.markupPercent),
            fixedAmount: 0,
            useSalePrices: rule.useSalePrices === true,
          })
        : null;

  return (
    <div className="rounded-lg border border-border/50 bg-card/80 px-2.5 py-2 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            <Link
              href={`/${locale}/suppliers/${rule.supplierId}`}
              className="hover:text-primary hover:underline"
            >
              {rule.supplierName}
            </Link>
          </p>
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {rule.type === "category"
              ? messages.storeCategorySyncSourceCategory
              : messages.storeCategorySyncSourceProduct}
            {sourceLabel}
          </p>
        </div>
        <RuleTypeBadge rule={rule} messages={messages} />
      </div>

      {markupLabel !== null && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-300">
            {messages.mappingProductPrice}: {markupLabel}
          </span>
          {rule.useSalePrices ? (
            <span className="text-[10px] text-muted">
              ({messages.priceOverrideIncludeSalePrices})
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

type Props = {
  rules: StoreCategorySyncRuleRef[];
  locale: string;
  messages: AppMessages;
  compact?: boolean;
  defaultOpen?: boolean;
};

export function StoreCategorySyncRules({
  rules,
  locale,
  messages,
  compact = false,
  defaultOpen,
}: Props) {
  const [open, setOpen] = useState(defaultOpen ?? !compact);

  if (rules.length === 0) return null;

  const ruleList = (
    <div className="space-y-2">
      {rules.map((rule) => (
        <SyncRuleRow
          key={`${rule.type}-${rule.id}`}
          rule={rule}
          locale={locale}
          messages={messages}
        />
      ))}
    </div>
  );

  const panelHeader = (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      className={`flex w-full items-center gap-2 text-start transition hover:bg-muted-bg/60 ${
        compact ? "px-3 py-2" : "px-3 py-2.5 hover:bg-muted-bg/80"
      }`}
    >
      <Chevron expanded={open} />
      <span className="min-w-0 flex-1 truncate text-xs font-bold text-foreground">
        {messages.storeCategoryMappedFrom}
      </span>
      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
        {rules.length}
      </span>
    </button>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-muted-bg/30">
      {panelHeader}
      {open ? (
        <div
          className={`border-t border-border/50 ${compact ? "space-y-2 px-3 pb-3 pt-2" : "px-3 py-2.5"}`}
        >
          {ruleList}
        </div>
      ) : null}
    </div>
  );
}
