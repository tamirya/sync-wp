"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect, useRef } from "react";
import {
  syncStoreProductsAction,
  syncStoreCategoriesAction,
} from "@/app/actions/sync-store";
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
const STORE_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-500",
  "from-red-500 to-orange-600",
  "from-cyan-500 to-sky-600",
  "from-lime-500 to-green-600",
  "from-sky-400 to-cyan-500",
];

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
  const [syncPending, startSyncTransition] = useTransition();

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

  const anyPending = syncPending;

  function executeSync() {
    setMenuOpen(false);
    startSyncTransition(async () => {
      const rProducts = await syncStoreProductsAction(locale, store.id);
      if (!rProducts.ok) {
        window.alert(`${messages.syncFailedAlert} ${rProducts.message}`);
        return;
      }
      const rCategories = await syncStoreCategoriesAction(locale, store.id);
      if (!rCategories.ok) {
        window.alert(`${messages.syncFailedAlert} ${rCategories.message}`);
        return;
      }
      router.refresh();
    });
  }

  /* icons */
  const EditIcon = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
  const SyncIcon = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M1 4v6h6" />
      <path d="M23 20v-6h-6" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
    </svg>
  );
  const gradient =
    STORE_GRADIENTS[parseInt(store.id, 10) % STORE_GRADIENTS.length];

  return (
    <>
      <article className="group flex flex-col rounded-[var(--radius-card)] border border-border/60 bg-card shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]">
        {/* Gradient header */}
        <div
          className={`relative h-24 w-full shrink-0 rounded-t-[var(--radius-card)] bg-gradient-to-br ${gradient}`}
        >
          {/* Decorative circles — clipped separately so dropdown isn't cut */}
          <div className="absolute inset-0 overflow-hidden rounded-t-[var(--radius-card)]">
            <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/10" />
            <div className="absolute -left-3 bottom-0 h-14 w-14 rounded-full bg-white/10" />
          </div>

          {/* Synced badge */}
          {store.synced && (
            <span className="absolute start-3 top-3 rounded-full bg-black/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
              {messages.storeSynced}
            </span>
          )}

          {/* Store initials or logo — centered */}
          <Link
            href={`/${locale}/stores/${store.id}`}
            className="absolute inset-0 flex items-center justify-center"
            tabIndex={-1}
            aria-hidden
          >
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl shadow-md ring-2 ring-white/30">
              {store.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={store.logoUrl}
                  alt={store.name}
                  className="h-full w-full object-contain bg-white"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/20 text-xl font-bold text-white backdrop-blur-sm">
                  {store.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          </Link>

          {/* Actions menu trigger — top end */}
          <div className="absolute end-3 top-3" ref={menuRef}>
            <button
              type="button"
              disabled={anyPending}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/25 text-white backdrop-blur-sm transition hover:bg-black/40 disabled:opacity-50"
              aria-label={locale === "he" ? "פעולות" : "Actions"}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              {anyPending ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                  aria-hidden
                >
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
                  label={messages.syncStore}
                  onClick={executeSync}
                  pending={syncPending}
                />
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 p-5">
          {/* Store name + URL */}
          <Link
            href={`/${locale}/stores/${store.id}`}
            className="-mx-1 -mt-1 rounded-xl px-1 pt-1 transition hover:bg-muted-bg/60"
          >
            <h2 className="truncate text-lg font-bold text-card-foreground group-hover:text-primary transition-colors">
              {store.name}
            </h2>
            <p className="truncate text-sm text-muted">{store.url}</p>
          </Link>

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

          {/* Last synced */}
          <p className="text-sm text-muted">
            <span className="font-semibold text-foreground/90">
              {messages.storeLastSynced}:{" "}
            </span>
            {formatSynced(store.lastSynced, locale)}
          </p>
        </div>
      </article>
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
