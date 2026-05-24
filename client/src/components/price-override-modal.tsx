"use client";

import { useEffect, useMemo, useState } from "react";
import { upsertPriceOverrideAction } from "@/app/actions/upsert-price-override";
import { fetchCategoryProductsForPricingAction } from "@/app/actions/fetch-category-products-for-pricing";
import {
  adjustMarkupPercent,
  computeMinPrice,
  effectiveProductPrice,
  formatMarkupLabel,
  previewPriceWithMarkup,
  type PriceOverride,
  type ProductPriceFields,
} from "@/lib/price-utils";

export type PriceOverrideModalMessages = {
  priceOverrideModalTitle: string;
  priceOverrideSupplierPrice: string;
  priceOverrideSupplierPriceMin: string;
  priceOverrideIncludeSalePrices: string;
  priceOverrideLoadingBase: string;
  priceOverrideNoBasePrice: string;
  priceOverrideMarkupLabel: string;
  priceOverridePreviewLabel: string;
  priceOverrideMarkup10: string;
  priceOverrideMarkup20: string;
  priceOverrideSave: string;
  priceOverrideCancel: string;
  priceOverrideSaving: string;
  priceOverrideSaved: string;
  priceOverrideError: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  supplierId: number;
  type: "product" | "category";
  targetId: number;
  targetName: string;
  currentOverride?: PriceOverride | null;
  supplierRegularPrice?: number | null;
  supplierSalePrice?: number | null;
  supplierDisplayPrice?: number | null;
  messages: PriceOverrideModalMessages;
  onSaved?: (override: PriceOverride) => void;
};

export function PriceOverrideModal({
  open,
  onClose,
  supplierId,
  type,
  targetId,
  targetName,
  currentOverride,
  supplierRegularPrice,
  supplierSalePrice,
  supplierDisplayPrice,
  messages,
  onSaved,
}: Props) {
  const [markupPercent, setMarkupPercent] = useState(
    currentOverride?.markupPercent ?? 0,
  );
  const [useSalePrices, setUseSalePrices] = useState(
    currentOverride?.useSalePrices ?? false,
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [categoryProducts, setCategoryProducts] = useState<ProductPriceFields[]>(
    [],
  );
  const [loadingBase, setLoadingBase] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (open) {
      setMarkupPercent(currentOverride?.markupPercent ?? 0);
      setUseSalePrices(currentOverride?.useSalePrices ?? false);
      setStatus("idle");
      setErrorMsg("");
    }
  }, [open, currentOverride]);

  useEffect(() => {
    if (!open || type !== "category") return;
    let cancelled = false;
    setLoadingBase(true);
    setCategoryProducts([]);
    fetchCategoryProductsForPricingAction(supplierId, targetId)
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setCategoryProducts(result.products);
      })
      .finally(() => {
        if (!cancelled) setLoadingBase(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, type, supplierId, targetId]);

  const basePrice = useMemo(() => {
    if (type === "product") {
      return effectiveProductPrice(
        {
          regularPrice: supplierRegularPrice ?? null,
          salePrice: supplierSalePrice ?? null,
          displayPrice: supplierDisplayPrice ?? null,
        },
        useSalePrices,
      );
    }
    return computeMinPrice(categoryProducts, useSalePrices);
  }, [
    type,
    supplierRegularPrice,
    supplierSalePrice,
    supplierDisplayPrice,
    categoryProducts,
    useSalePrices,
  ]);

  const previewPrice = previewPriceWithMarkup(basePrice, markupPercent);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(markupPercent) || markupPercent < 0) return;

    setStatus("saving");
    setErrorMsg("");

    const result = await upsertPriceOverrideAction(supplierId, {
      type,
      targetId,
      markupPercent,
      useSalePrices,
    });

    if (result.ok) {
      setStatus("saved");
      onSaved?.({ markupPercent, useSalePrices });
      setTimeout(onClose, 800);
    } else {
      setStatus("error");
      setErrorMsg(result.message);
    }
  }

  const isSaving = status === "saving";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-card shadow-2xl ring-1 ring-border/60 p-6">
        <div className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
            {type === "product" ? "Product" : "Category"}
          </p>
          <h2 className="mt-1 text-lg font-bold text-foreground leading-snug">
            {messages.priceOverrideModalTitle}
          </h2>
          <p className="mt-0.5 text-sm text-muted line-clamp-1">{targetName}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-border bg-background px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-muted">
                {type === "product"
                  ? messages.priceOverrideSupplierPrice
                  : messages.priceOverrideSupplierPriceMin}
              </span>
              <span className="text-sm font-bold text-foreground">
                {loadingBase
                  ? messages.priceOverrideLoadingBase
                  : basePrice != null
                    ? `₪${basePrice.toFixed(2)}`
                    : messages.priceOverrideNoBasePrice}
              </span>
            </div>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={useSalePrices}
                disabled={isSaving || loadingBase}
                onChange={(e) => setUseSalePrices(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/30"
              />
              {messages.priceOverrideIncludeSalePrices}
            </label>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-center">
            <p className="text-xs font-semibold text-muted">
              {messages.priceOverrideMarkupLabel}
            </p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {formatMarkupLabel(markupPercent)}
            </p>
            {previewPrice && (
              <p className="mt-1 text-xs text-muted">
                {messages.priceOverridePreviewLabel}: {previewPrice}
              </p>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setMarkupPercent((p) => adjustMarkupPercent(p, -1))}
              disabled={isSaving}
              className="rounded-xl border border-border bg-card px-2 py-2 text-sm font-semibold text-foreground transition hover:bg-muted-bg disabled:opacity-50"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setMarkupPercent((p) => adjustMarkupPercent(p, 1))}
              disabled={isSaving}
              className="rounded-xl border border-border bg-card px-2 py-2 text-sm font-semibold text-foreground transition hover:bg-muted-bg disabled:opacity-50"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setMarkupPercent(10)}
              disabled={isSaving}
              className="rounded-xl border border-border bg-card px-2 py-2 text-xs font-semibold text-foreground transition hover:bg-muted-bg disabled:opacity-50"
            >
              {messages.priceOverrideMarkup10}
            </button>
            <button
              type="button"
              onClick={() => setMarkupPercent(20)}
              disabled={isSaving}
              className="rounded-xl border border-border bg-card px-2 py-2 text-xs font-semibold text-foreground transition hover:bg-muted-bg disabled:opacity-50"
            >
              {messages.priceOverrideMarkup20}
            </button>
          </div>

          {status === "error" && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 ring-1 ring-red-200">
              {messages.priceOverrideError}
              {errorMsg ? `: ${errorMsg}` : ""}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted-bg disabled:opacity-50"
            >
              {messages.priceOverrideCancel}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
            >
              {status === "saving"
                ? messages.priceOverrideSaving
                : status === "saved"
                  ? messages.priceOverrideSaved
                  : messages.priceOverrideSave}
            </button>
          </div>
        </form>

        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-muted/60 transition hover:bg-muted-bg hover:text-foreground"
          aria-label={messages.priceOverrideCancel}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
