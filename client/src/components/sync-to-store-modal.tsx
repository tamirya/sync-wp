"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, useTransition } from "react";
import {
  createCategoryRulesAction,
  createProductRulesAction,
} from "@/app/actions/mapping-rules";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type Store = { id: string; name: string };
type StoreCategory = { id: number; name: string; parent: number };

export type SyncToStoreModalMessages = {
  syncModalTitle: string;
  syncModalSelectStore: string;
  syncModalSelectCategory: string;
  syncModalCreateRule: string;
  syncModalSuccess: string;
  syncModalError: string;
  syncModalLoadingStores: string;
  syncModalLoadingCategories: string;
  syncModalNoStores: string;
  syncModalNoCategories: string;
  confirmNo: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  locale: string;
  supplierId: number;
  /** Supplier category IDs to create category rules for */
  selectedCategoryIds: number[];
  /** Supplier product IDs to create product rules for */
  selectedProductIds: number[];
  messages: SyncToStoreModalMessages;
  onSuccess?: () => void;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={`${className} animate-spin`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal                                                               */
/* ------------------------------------------------------------------ */
export function SyncToStoreModal({
  open,
  onClose,
  locale,
  supplierId,
  selectedCategoryIds,
  selectedProductIds,
  messages,
  onSuccess,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, startSaveTransition] = useTransition();

  const dir = locale === "he" ? "rtl" : "ltr";
  const totalSelected = selectedCategoryIds.length + selectedProductIds.length;

  useEffect(() => {
    setMounted(true);
  }, []);

  /* Fetch stores when modal opens */
  useEffect(() => {
    if (!open) return;
    setSelectedStoreId("");
    setSelectedCategoryId("");
    setStoreCategories([]);
    setSuccessMsg("");
    setErrorMsg("");

    setLoadingStores(true);
    fetch("/api/stores")
      .then((r) => r.json())
      .then((json: { data?: { id: number; name: string }[] }) => {
        const rows = json.data ?? [];
        setStores(rows.map((s) => ({ id: String(s.id), name: s.name })));
      })
      .catch(() => setStores([]))
      .finally(() => setLoadingStores(false));
  }, [open]);

  /* Fetch store categories when store is selected */
  useEffect(() => {
    if (!selectedStoreId) {
      setStoreCategories([]);
      return;
    }
    setSelectedCategoryId("");
    setLoadingCategories(true);
    fetch(`/api/stores/${selectedStoreId}/categories`)
      .then((r) => r.json())
      .then((json: { data?: StoreCategory[] }) => {
        setStoreCategories(json.data ?? []);
      })
      .catch(() => setStoreCategories([]))
      .finally(() => setLoadingCategories(false));
  }, [selectedStoreId]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  /* Lock body scroll */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function handleCreate() {
    if (!selectedStoreId || !selectedCategoryId) return;
    setSuccessMsg("");
    setErrorMsg("");

    const storeId = Number(selectedStoreId);
    const storeCategoryId = Number(selectedCategoryId);

    startSaveTransition(async () => {
      const results = await Promise.all([
        selectedCategoryIds.length > 0
          ? createCategoryRulesAction(
              locale,
              selectedCategoryIds.map((supplierCategoryId) => ({
                storeId,
                supplierId,
                supplierCategoryId,
                storeCategoryId,
              })),
            )
          : Promise.resolve({ ok: true as const }),

        selectedProductIds.length > 0
          ? createProductRulesAction(
              locale,
              selectedProductIds.map((sourceProductId) => ({
                storeId,
                supplierId,
                sourceProductId,
                storeCategoryId,
              })),
            )
          : Promise.resolve({ ok: true as const }),
      ]);

      const failed = results.find((r) => !r.ok);
      if (failed && !failed.ok) {
        setErrorMsg(`${messages.syncModalError} ${failed.error}`);
      } else {
        setSuccessMsg(messages.syncModalSuccess);
        onSuccess?.();
      }
    });
  }

  if (!open || !mounted) return null;

  const canCreate =
    Boolean(selectedStoreId) && Boolean(selectedCategoryId) && !saving;

  const node = (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        aria-label={messages.confirmNo}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        dir={dir}
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card-hover ring-1 ring-black/5"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold tracking-tight text-card-foreground">
            {messages.syncModalTitle}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-muted-bg hover:text-foreground"
            aria-label={messages.confirmNo}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Selection summary badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedCategoryIds.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden>
                <path d="M3 3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H8.5L7 3H3z" />
              </svg>
              {selectedCategoryIds.length} {locale === "he" ? "קטגוריות" : "categories"}
            </span>
          )}
          {selectedProductIds.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-semibold text-cyan-700">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3 w-3" aria-hidden>
                <rect x="2" y="2" width="12" height="12" rx="1.5" />
                <circle cx="5.5" cy="5.5" r="1" />
                <path d="M14 10 10 6 2 14" />
              </svg>
              {selectedProductIds.length} {locale === "he" ? "מוצרים" : "products"}
            </span>
          )}
          {totalSelected === 0 && (
            <span className="text-sm text-muted">—</span>
          )}
        </div>

        <div className="mt-5 space-y-4">
          {/* Store dropdown */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted">
              {messages.syncModalSelectStore}
            </label>
            {loadingStores ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Spinner /> {messages.syncModalLoadingStores}
              </div>
            ) : stores.length === 0 ? (
              <p className="text-sm text-muted">{messages.syncModalNoStores}</p>
            ) : (
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground shadow-sm transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">— {messages.syncModalSelectStore} —</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Store category dropdown */}
          {selectedStoreId && (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-muted">
                {messages.syncModalSelectCategory}
              </label>
              {loadingCategories ? (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Spinner /> {messages.syncModalLoadingCategories}
                </div>
              ) : storeCategories.length === 0 ? (
                <p className="text-sm text-muted">{messages.syncModalNoCategories}</p>
              ) : (
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground shadow-sm transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">— {messages.syncModalSelectCategory} —</option>
                  {storeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parent === 0 ? "" : "↳ "}
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Feedback */}
          {successMsg && (
            <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              {successMsg}
            </p>
          )}
          {errorMsg && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border bg-muted-bg/80 px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted-bg"
          >
            {messages.confirmNo}
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Spinner className="h-4 w-4" />}
            {messages.syncModalCreateRule}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
