"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect, useRef } from "react";
import { deleteStoreAction } from "@/app/actions/delete-entities";
import {
  syncStoreProductsAction,
  syncStoreCategoriesAction,
  clearStoreWooProductsAction,
  clearStoreWooCategoriesAction,
} from "@/app/actions/sync-store";
import { ConfirmModal } from "@/components/confirm-modal";
import type { Locale } from "@/i18n/config";
import type { StoreCardData } from "@/lib/stores-api";
import type { AppMessages } from "@/messages/app";

export type { StoreCardData };

type Props = {
  locale: Locale;
  messages: AppMessages;
  stores: StoreCardData[];
};

function formatSynced(iso: string | null, locale: Locale) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "he-IL", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "—";
  }
}

function formatOptionalCount(n: number | null, locale: Locale) {
  if (n === null) return "—";
  return n.toLocaleString(locale === "en" ? "en-US" : "he-IL");
}

/* ------------------------------------------------------------------ */
/*  Spinner                                                              */
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
/*  Dropdown menu item                                                   */
/* ------------------------------------------------------------------ */
function MenuItem({
  icon,
  label,
  onClick,
  pending,
  destructive,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  pending?: boolean;
  destructive?: boolean;
  href?: string;
}) {
  const base =
    "flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50";
  const color = destructive
    ? "text-destructive hover:bg-destructive/8"
    : "text-foreground hover:bg-muted-bg";

  if (href) {
    return (
      <Link href={href} className={`${base} ${color}`}>
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {icon}
        </span>
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`${base} ${color}`}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        {pending ? <Spinner className="h-4 w-4" /> : icon}
      </span>
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Store card                                                           */
/* ------------------------------------------------------------------ */
function StoreCardItem({
  store,
  locale,
  messages,
}: {
  store: StoreCardData;
  locale: Locale;
  messages: AppMessages;
}) {
  const router = useRouter();
  const [deletePending, startDeleteTransition] = useTransition();
  const [syncProductsPending, startSyncProductsTransition] = useTransition();
  const [syncCategoriesPending, startSyncCategoriesTransition] = useTransition();
  const [clearWooPending, startClearWooTransition] = useTransition();
  const [clearWooCatPending, startClearWooCatTransition] = useTransition();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [clearWooOpen, setClearWooOpen] = useState(false);
  const [clearWooCatOpen, setClearWooCatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  /* close on outside click */
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const anyPending =
    deletePending || syncProductsPending || syncCategoriesPending || clearWooPending || clearWooCatPending;

  function executeDelete() {
    setDeleteOpen(false);
    startDeleteTransition(async () => {
      const r = await deleteStoreAction(locale, store.id);
      if (!r.ok) {
        window.alert(`${messages.deleteFailedAlert} ${r.message}`);
        return;
      }
      router.refresh();
    });
  }

  function executeSyncProducts() {
    setMenuOpen(false);
    startSyncProductsTransition(async () => {
      const r = await syncStoreProductsAction(locale, store.id);
      if (!r.ok) {
        window.alert(`${messages.syncFailedAlert} ${r.message}`);
        return;
      }
      router.refresh();
    });
  }

  function executeSyncCategories() {
    setMenuOpen(false);
    startSyncCategoriesTransition(async () => {
      const r = await syncStoreCategoriesAction(locale, store.id);
      if (!r.ok) {
        window.alert(`${messages.syncFailedAlert} ${r.message}`);
        return;
      }
      router.refresh();
    });
  }

  function executeClearWoo() {
    setClearWooOpen(false);
    startClearWooTransition(async () => {
      const r = await clearStoreWooProductsAction(locale, store.id);
      if (!r.ok) {
        window.alert(`${messages.clearWooProductsFailedAlert} ${r.message}`);
        return;
      }
      router.refresh();
    });
  }

  function executeClearWooCategories() {
    setClearWooCatOpen(false);
    startClearWooCatTransition(async () => {
      const r = await clearStoreWooCategoriesAction(locale, store.id);
      if (!r.ok) {
        window.alert(`${messages.clearWooCategoriesFailedAlert} ${r.message}`);
        return;
      }
      router.refresh();
    });
  }

  /* icons */
  const EditIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
  const SyncIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
      <path d="M1 4v6h6" /><path d="M23 20v-6h-6" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
    </svg>
  );
  const TrashIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" />
    </svg>
  );

  return (
    <>
      <article className="group flex flex-col rounded-[var(--radius-card)] border border-border/80 bg-card p-0 shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]">
        <div className="flex flex-col gap-4 p-6 pb-5">

          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/${locale}/stores/${store.id}`}
              className="flex min-w-0 items-center gap-3 rounded-xl p-1 -m-1 transition hover:bg-muted-bg/60"
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 text-base font-bold text-white shadow-sm ring-2 ring-white/40"
                aria-hidden
              >
                {store.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-card-foreground group-hover:text-primary transition-colors">
                  {store.name}
                </h2>
                <p className="truncate text-sm text-muted">{store.url}</p>
              </div>
            </Link>

            <div className="flex shrink-0 items-center gap-2">
              {store.synced && (
                <span className="rounded-full bg-success-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-success">
                  {messages.storeSynced}
                </span>
              )}

              {/* Actions menu trigger */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  disabled={anyPending}
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted shadow-sm transition hover:border-primary/30 hover:bg-muted-bg hover:text-primary disabled:opacity-50"
                  aria-label={locale === "he" ? "פעולות" : "Actions"}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  {anyPending ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
                      <circle cx="12" cy="5" r="1.5" />
                      <circle cx="12" cy="12" r="1.5" />
                      <circle cx="12" cy="19" r="1.5" />
                    </svg>
                  )}
                </button>

                {/* Dropdown */}
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute end-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg ring-1 ring-black/5"
                  >
                    <MenuItem
                      icon={EditIcon}
                      label={messages.editStoreAria}
                      href={`/${locale}/stores/${store.id}/edit`}
                    />

                    <div className="my-1 border-t border-border/60" />

                    <MenuItem
                      icon={SyncIcon}
                      label={messages.syncStoreProducts}
                      onClick={executeSyncProducts}
                      pending={syncProductsPending}
                    />
                    <MenuItem
                      icon={SyncIcon}
                      label={messages.syncStoreCategories}
                      onClick={executeSyncCategories}
                      pending={syncCategoriesPending}
                    />

                    <div className="my-1 border-t border-border/60" />

                    <MenuItem
                      icon={TrashIcon}
                      label={messages.clearWooProducts}
                      onClick={() => { setMenuOpen(false); setClearWooOpen(true); }}
                      pending={clearWooPending}
                      destructive
                    />
                    <MenuItem
                      icon={TrashIcon}
                      label={messages.clearWooCategories}
                      onClick={() => { setMenuOpen(false); setClearWooCatOpen(true); }}
                      pending={clearWooCatPending}
                      destructive
                    />
                    <MenuItem
                      icon={TrashIcon}
                      label={messages.deleteStoreAria}
                      onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}
                      pending={deletePending}
                      destructive
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <dl className="grid grid-cols-2 gap-3 rounded-xl bg-muted-bg/70 p-4 ring-1 ring-border/60">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">
                {messages.storeTotalProducts}
              </dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-card-foreground">
                {formatOptionalCount(store.products, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">
                {messages.storeTotalCategories}
              </dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-card-foreground">
                {formatOptionalCount(store.categories, locale)}
              </dd>
            </div>
          </dl>

          {/* Footer */}
          <p className="text-sm text-muted">
            <span className="font-semibold text-foreground/90">
              {messages.storeLastSynced}:{" "}
            </span>
            {formatSynced(store.lastSynced, locale)}
          </p>
        </div>
      </article>

      <ConfirmModal
        open={deleteOpen}
        dir={locale === "he" ? "rtl" : "ltr"}
        title={messages.deleteConfirmTitle}
        message={messages.confirmDeleteStore}
        labelConfirm={messages.confirmYes}
        labelCancel={messages.confirmNo}
        onConfirm={executeDelete}
        onCancel={() => setDeleteOpen(false)}
      />
      <ConfirmModal
        open={clearWooOpen}
        dir={locale === "he" ? "rtl" : "ltr"}
        title={messages.clearWooProductsConfirmTitle}
        message={messages.confirmClearWooProducts}
        labelConfirm={messages.confirmYes}
        labelCancel={messages.confirmNo}
        onConfirm={executeClearWoo}
        onCancel={() => setClearWooOpen(false)}
      />
      <ConfirmModal
        open={clearWooCatOpen}
        dir={locale === "he" ? "rtl" : "ltr"}
        title={messages.clearWooCategoriesConfirmTitle}
        message={messages.confirmClearWooCategories}
        labelConfirm={messages.confirmYes}
        labelCancel={messages.confirmNo}
        onConfirm={executeClearWooCategories}
        onCancel={() => setClearWooCatOpen(false)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Grid                                                                 */
/* ------------------------------------------------------------------ */
export function StoreGrid({ locale, messages, stores }: Props) {
  return (
    <div className="mt-10 grid auto-rows-fr gap-6 lg:grid-cols-2 xl:max-w-5xl">
      {stores.map((store) => (
        <StoreCardItem
          key={store.id}
          store={store}
          locale={locale}
          messages={messages}
        />
      ))}

      <Link
        href={`/${locale}/stores/new`}
        className="flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed border-border/90 bg-card/40 p-8 text-center shadow-[var(--shadow-card)] transition hover:border-primary/35 hover:bg-muted-bg/60 hover:shadow-[var(--shadow-card-hover)]"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted-bg text-3xl font-light text-muted ring-1 ring-border">
          +
        </div>
        <p className="mt-5 text-lg font-bold text-card-foreground">
          {messages.addAnotherStore}
        </p>
        <p className="mt-1.5 max-w-xs text-sm text-muted">
          {messages.addAnotherStoreHint}
        </p>
      </Link>
    </div>
  );
}
