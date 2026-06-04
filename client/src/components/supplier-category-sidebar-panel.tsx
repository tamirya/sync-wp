"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Locale } from "@/i18n/config";
import {
  buildCategoryTree,
  type MappingCategoryNode,
} from "@/lib/mapping-tree-utils";
import { expandedIdsForCategory } from "@/lib/supplier-nav-utils";
import type { AppMessages } from "@/messages/app";

type FlatCategory = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count?: number;
};

type Props = {
  locale: Locale;
  supplierId: string;
  activeCategoryId: number | null;
  messages: AppMessages;
  onNavigate?: () => void;
  onOpenChange?: (open: boolean) => void;
};

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${
        expanded ? "rotate-90" : ""
      }`}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CategoryTreeRow({
  node,
  depth,
  locale,
  supplierId,
  activeCategoryId,
  open,
  toggle,
  onNavigate,
}: {
  node: MappingCategoryNode;
  depth: number;
  locale: Locale;
  supplierId: string;
  activeCategoryId: number | null;
  open: Set<number>;
  toggle: (id: number) => void;
  onNavigate?: () => void;
}) {
  const hasChildren = node.children.length > 0;
  const expanded = open.has(node.id);
  const isActive = activeCategoryId === node.id;
  const href = `/${locale}/suppliers/${supplierId}/categories/${node.id}`;
  const pad = depth * 12;

  return (
    <div>
      <div
        className={`flex items-center gap-0.5 rounded-lg py-0.5 transition ${
          isActive ? "bg-shell-sidebar-active" : "hover:bg-shell-sidebar-accent"
        }`}
        style={{ paddingInlineStart: `${pad + 4}px`, paddingInlineEnd: "4px" }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={node.name}
            onClick={() => toggle(node.id)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-shell-sidebar-accent hover:text-foreground"
          >
            <Chevron expanded={expanded} />
          </button>
        ) : (
          <span className="h-6 w-6 shrink-0" aria-hidden />
        )}
        <Link
          href={href}
          onClick={onNavigate}
          className={`min-w-0 flex-1 truncate py-1 text-start text-xs leading-snug ${
            isActive
              ? "font-semibold text-primary"
              : "font-medium text-shell-sidebar-foreground"
          }`}
        >
          {node.name}
          {node.count != null && node.count > 0 ? (
            <span className="ms-1 font-normal text-muted">({node.count})</span>
          ) : null}
        </Link>
      </div>

      {hasChildren && expanded ? (
        <div>
          {node.children.map((child) => (
            <CategoryTreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              locale={locale}
              supplierId={supplierId}
              activeCategoryId={activeCategoryId}
              open={open}
              toggle={toggle}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SupplierCategorySidebarPanel({
  locale,
  supplierId,
  activeCategoryId,
  messages,
  onNavigate,
  onOpenChange,
}: Props) {
  const [supplierName, setSupplierName] = useState<string | null>(null);
  const [flat, setFlat] = useState<FlatCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const [panelOpen, setPanelOpen] = useState(true);

  const setPanelOpenState = useCallback(
    (next: boolean) => {
      setPanelOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  const tree = useMemo(() => buildCategoryTree(flat), [flat]);

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    void (async () => {
      try {
        const res = await fetch(
          `/api/suppliers/${supplierId}/with-categories`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          if (!cancelled) {
            setError(true);
            setLoading(false);
          }
          return;
        }
        const json = (await res.json()) as {
          data?: {
            supplier?: { name?: string };
            categories?: FlatCategory[];
          };
        };
        if (cancelled) {
          return;
        }
        const categories = json.data?.categories ?? [];
        setSupplierName(json.data?.supplier?.name ?? null);
        setFlat(categories);
        const initial = expandedIdsForCategory(categories, activeCategoryId);
        for (const root of categories.filter((c) => c.parent === 0)) {
          initial.add(root.id);
        }
        setOpen(initial);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supplierId, activeCategoryId]);

  useEffect(() => {
    if (flat.length === 0) {
      return;
    }
    setOpen((prev) => {
      const next = new Set(prev);
      for (const id of expandedIdsForCategory(flat, activeCategoryId)) {
        next.add(id);
      }
      return next;
    });
  }, [activeCategoryId, flat]);

  const rootHref = `/${locale}/suppliers/${supplierId}`;
  const isRootActive = activeCategoryId == null;
  const panelTitle = supplierName ?? messages.supplierNavAllCategories;

  return (
    <div className="flex flex-col gap-2">
      <Link
        href={`/${locale}/suppliers`}
        onClick={onNavigate}
        className="inline-flex items-center gap-1 px-1 text-[11px] font-semibold text-primary hover:underline"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3 w-3 rtl:rotate-180"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
            clipRule="evenodd"
          />
        </svg>
        {messages.supplierNavBackToList}
      </Link>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-shell-sidebar-accent/40">
        <button
          type="button"
          onClick={() => setPanelOpenState(!panelOpen)}
          aria-expanded={panelOpen}
          className="flex w-full items-center gap-2 px-2.5 py-2 text-start transition hover:bg-shell-sidebar-accent"
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
              panelOpen ? "rotate-180" : ""
            }`}
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          <span className="min-w-0 flex-1 truncate text-xs font-bold text-shell-sidebar-foreground">
            {panelTitle}
          </span>
          {!loading && flat.length > 0 ? (
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {flat.length}
            </span>
          ) : null}
        </button>

        {panelOpen ? (
          <nav
            aria-label={messages.supplierNavCategoriesAria}
            className="border-t border-border/50 px-1.5 pb-2 pt-1"
          >
            <Link
              href={rootHref}
              onClick={onNavigate}
              className={`block rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                isRootActive
                  ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                  : "text-shell-sidebar-foreground hover:bg-shell-sidebar-accent"
              }`}
            >
              {messages.supplierNavAllCategories}
            </Link>

            {loading ? (
              <p className="mt-2 px-2 text-[11px] text-muted">
                {messages.supplierNavLoading}
              </p>
            ) : error ? (
              <p className="mt-2 px-2 text-[11px] text-destructive">
                {messages.supplierCategoriesLoadError}
              </p>
            ) : tree.length === 0 ? (
              <p className="mt-2 px-2 text-[11px] text-muted">
                {messages.supplierCategoriesEmpty}
              </p>
            ) : (
              <div className="mt-1 space-y-0.5">
                {tree.map((node) => (
                  <CategoryTreeRow
                    key={node.id}
                    node={node}
                    depth={0}
                    locale={locale}
                    supplierId={supplierId}
                    activeCategoryId={activeCategoryId}
                    open={open}
                    toggle={toggle}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            )}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
