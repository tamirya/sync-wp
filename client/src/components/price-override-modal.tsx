"use client";

import { useEffect, useMemo, useState } from "react";
import { upsertPriceOverrideAction, deletePriceOverrideAction } from "@/app/actions/upsert-price-override";
import { fetchCategoryProductsForPricingAction } from "@/app/actions/fetch-category-products-for-pricing";
import { ConfirmModal } from "@/components/confirm-modal";
import {
  adjustFixedAmount,
  adjustMarkupPercent,
  computeMinPrice,
  effectiveProductPrice,
  formatFixedAmountLabel,
  formatMarkupLabel,
  isValidPriceOverride,
  normalizePriceOverride,
  previewPriceWithOverride,
  type PriceOverride,
  type PricingMode,
  type ProductPriceFields,
} from "@/lib/price-utils";

export type PriceOverrideModalMessages = {
  priceOverrideModalTitle: string;
  priceOverrideTargetCategory: string;
  priceOverrideTargetProduct: string;
  priceOverrideSupplierPrice: string;
  priceOverrideSupplierPriceMin: string;
  priceOverrideIncludeSalePrices: string;
  priceOverrideLoadingBase: string;
  priceOverrideNoBasePrice: string;
  priceOverrideMarkupLabel: string;
  priceOverridePreviewLabel: string;
  priceOverrideMarkup10: string;
  priceOverrideMarkup20: string;
  priceOverrideModePercent: string;
  priceOverrideModeFixedAmount: string;
  priceOverrideFixedAmountLabel: string;
  priceOverrideFixedAmount5: string;
  priceOverrideFixedAmountMinus5: string;
  priceOverrideSave: string;
  priceOverrideCancel: string;
  priceOverrideSaving: string;
  priceOverrideSaved: string;
  priceOverrideError: string;
  priceOverrideRemove: string;
  priceOverrideRemoving: string;
  priceOverrideRemoved: string;
  priceOverrideRemoveConfirm: string;
  priceOverrideEditAria: string;
  priceOverrideRemoveAria: string;
  confirmYes: string;
  confirmNo: string;
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
  onRemoved?: () => void;
};

export function PriceOverrideModal({
  open,
  onClose,
  supplierId,
  type,
  targetId,
  targetName: _targetName,
  currentOverride,
  supplierRegularPrice,
  supplierSalePrice,
  supplierDisplayPrice,
  messages,
  onSaved,
  onRemoved,
}: Props) {
  const [pricingMode, setPricingMode] = useState<PricingMode>("percent");
  const [markupPercent, setMarkupPercent] = useState(0);
  const [fixedAmount, setFixedAmount] = useState(0);
  const [useSalePrices, setUseSalePrices] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error" | "removing" | "removed">(
    "idle",
  );
  const [categoryProducts, setCategoryProducts] = useState<ProductPriceFields[]>(
    [],
  );
  const [loadingBase, setLoadingBase] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [dir, setDir] = useState<"rtl" | "ltr">("rtl");

  useEffect(() => {
    if (open) {
      setDir(document.documentElement.dir === "ltr" ? "ltr" : "rtl");
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      const normalized = normalizePriceOverride(currentOverride ?? {});
      setPricingMode(normalized.pricingMode);
      setMarkupPercent(normalized.markupPercent);
      setFixedAmount(normalized.fixedAmount);
      setUseSalePrices(normalized.useSalePrices);
      setStatus("idle");
      setErrorMsg("");
      setRemoveConfirmOpen(false);
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

  const draftOverride = useMemo(
    (): PriceOverride => ({
      pricingMode,
      markupPercent,
      fixedAmount,
      useSalePrices,
    }),
    [pricingMode, markupPercent, fixedAmount, useSalePrices],
  );

  const previewPrice = previewPriceWithOverride(basePrice, draftOverride);
  const valueLabel =
    pricingMode === "fixed_amount"
      ? formatFixedAmountLabel(fixedAmount)
      : formatMarkupLabel(markupPercent);
  const adjustmentLabel =
    pricingMode === "fixed_amount"
      ? messages.priceOverrideFixedAmountLabel
      : messages.priceOverrideMarkupLabel;

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidPriceOverride(draftOverride)) return;

    setStatus("saving");
    setErrorMsg("");

    const result = await upsertPriceOverrideAction(supplierId, {
      type,
      targetId,
      pricingMode: draftOverride.pricingMode,
      markupPercent: draftOverride.pricingMode === "percent" ? draftOverride.markupPercent : 0,
      fixedAmount:
        draftOverride.pricingMode === "fixed_amount" ? draftOverride.fixedAmount : null,
      useSalePrices: draftOverride.useSalePrices,
    });

    if (result.ok) {
      setStatus("saved");
      onSaved?.(draftOverride);
      setTimeout(onClose, 800);
    } else {
      setStatus("error");
      setErrorMsg(result.message);
    }
  }

  const isSaving = status === "saving";
  const isBusy = isSaving || status === "removing";

  async function executeRemove() {
    if (!currentOverride) return;

    setRemoveConfirmOpen(false);
    setStatus("removing");
    setErrorMsg("");

    const result = await deletePriceOverrideAction(supplierId, { type, targetId });
    if (result.ok) {
      setStatus("removed");
      onRemoved?.();
      setTimeout(onClose, 600);
    } else {
      setStatus("error");
      setErrorMsg(result.message);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-card shadow-2xl ring-1 ring-border/60 p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-foreground leading-snug">
            {messages.priceOverrideModalTitle}
          </h2>
          <p className="mt-0.5 text-sm text-muted line-clamp-1">
            {type === "product"
              ? messages.priceOverrideTargetProduct
              : messages.priceOverrideTargetCategory}
          </p>
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
                disabled={isBusy || loadingBase}
                onChange={(e) => setUseSalePrices(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary/30"
              />
              {messages.priceOverrideIncludeSalePrices}
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-background p-1">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setPricingMode("percent")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                pricingMode === "percent"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:bg-muted-bg hover:text-foreground"
              }`}
            >
              {messages.priceOverrideModePercent}
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setPricingMode("fixed_amount")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                pricingMode === "fixed_amount"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:bg-muted-bg hover:text-foreground"
              }`}
            >
              {messages.priceOverrideModeFixedAmount}
            </button>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-center">
            <p className="text-xs font-semibold text-muted">{adjustmentLabel}</p>
            <p dir="ltr" className="mt-1 text-2xl font-bold text-primary tabular-nums">
              {valueLabel}
            </p>
            {previewPrice && (
              <p className="mt-1 text-xs text-muted">
                {messages.priceOverridePreviewLabel}:{" "}
                <span dir="ltr" className="font-semibold text-foreground">
                  {previewPrice}
                </span>
              </p>
            )}
          </div>

          {pricingMode === "percent" ? (
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setMarkupPercent((p) => adjustMarkupPercent(p, -1))}
                disabled={isBusy}
                className="rounded-xl border border-border bg-card px-2 py-2 text-sm font-semibold text-foreground transition hover:bg-muted-bg disabled:opacity-50"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => setMarkupPercent((p) => adjustMarkupPercent(p, 1))}
                disabled={isBusy}
                className="rounded-xl border border-border bg-card px-2 py-2 text-sm font-semibold text-foreground transition hover:bg-muted-bg disabled:opacity-50"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setMarkupPercent(10)}
                disabled={isBusy}
                className="rounded-xl border border-border bg-card px-2 py-2 text-xs font-semibold text-foreground transition hover:bg-muted-bg disabled:opacity-50"
              >
                {messages.priceOverrideMarkup10}
              </button>
              <button
                type="button"
                onClick={() => setMarkupPercent(20)}
                disabled={isBusy}
                className="rounded-xl border border-border bg-card px-2 py-2 text-xs font-semibold text-foreground transition hover:bg-muted-bg disabled:opacity-50"
              >
                {messages.priceOverrideMarkup20}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setFixedAmount((v) => adjustFixedAmount(v, -1))}
                disabled={isBusy}
                className="rounded-xl border border-border bg-card px-2 py-2 text-sm font-semibold text-foreground transition hover:bg-muted-bg disabled:opacity-50"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => setFixedAmount((v) => adjustFixedAmount(v, 1))}
                disabled={isBusy}
                className="rounded-xl border border-border bg-card px-2 py-2 text-sm font-semibold text-foreground transition hover:bg-muted-bg disabled:opacity-50"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setFixedAmount((v) => adjustFixedAmount(v, -5))}
                disabled={isBusy}
                className="rounded-xl border border-border bg-card px-2 py-2 text-xs font-semibold text-foreground transition hover:bg-muted-bg disabled:opacity-50"
              >
                {messages.priceOverrideFixedAmountMinus5}
              </button>
              <button
                type="button"
                onClick={() => setFixedAmount((v) => adjustFixedAmount(v, 5))}
                disabled={isBusy}
                className="rounded-xl border border-border bg-card px-2 py-2 text-xs font-semibold text-foreground transition hover:bg-muted-bg disabled:opacity-50"
              >
                {messages.priceOverrideFixedAmount5}
              </button>
            </div>
          )}

          {status === "error" && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 ring-1 ring-red-200">
              {messages.priceOverrideError}
              {errorMsg ? `: ${errorMsg}` : ""}
            </p>
          )}
          {status === "removed" && (
            <p className="rounded-xl bg-green-50 px-3 py-2 text-xs text-green-700 ring-1 ring-green-200">
              {messages.priceOverrideRemoved}
            </p>
          )}

          {currentOverride ? (
            <button
              type="button"
              onClick={() => setRemoveConfirmOpen(true)}
              disabled={isBusy}
              className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
            >
              {status === "removing"
                ? messages.priceOverrideRemoving
                : messages.priceOverrideRemove}
            </button>
          ) : null}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="flex-1 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted-bg disabled:opacity-50"
            >
              {messages.priceOverrideCancel}
            </button>
            <button
              type="submit"
              disabled={isBusy}
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
          className="absolute end-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-muted/60 transition hover:bg-muted-bg hover:text-foreground"
          aria-label={messages.priceOverrideCancel}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <ConfirmModal
        open={removeConfirmOpen}
        dir={dir}
        title={messages.priceOverrideRemove}
        message={messages.priceOverrideRemoveConfirm}
        labelConfirm={messages.confirmYes}
        labelCancel={messages.confirmNo}
        onConfirm={executeRemove}
        onCancel={() => setRemoveConfirmOpen(false)}
      />
    </div>
  );
}
