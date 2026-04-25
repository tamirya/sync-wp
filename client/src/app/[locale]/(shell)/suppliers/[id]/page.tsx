import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { backendFetch } from "@/lib/backend-fetch";
import { getAppMessages } from "@/messages/app";
import { formatWooStorePriceFromFields } from "@/lib/mapping-tree-utils";
import {
  SupplierCategoriesClient,
  type ClientCategory,
  type ClientProduct,
} from "./supplier-categories-client";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type Supplier = { id: number; name: string; url: string };

type CategoryImage = { src?: string | null; alt?: string | null };

type Category = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count?: number;
  image?: CategoryImage | null;
  images?: CategoryImage[] | null;
};

type RawProduct = Record<string, unknown>;

/* ------------------------------------------------------------------ */
/*  Data fetchers                                                       */
/* ------------------------------------------------------------------ */
async function fetchSupplier(
  id: string,
): Promise<{ ok: true; supplier: Supplier } | { ok: false; status: number }> {
  try {
    const res = await backendFetch(`/suppliers/${id}`);
    if (!res.ok) return { ok: false, status: res.status };
    const json = (await res.json()) as { data: Supplier };
    return { ok: true, supplier: json.data };
  } catch {
    return { ok: false, status: 401 };
  }
}

async function fetchCategories(
  id: string,
): Promise<{ ok: true; categories: Category[] } | { ok: false }> {
  try {
    const res = await backendFetch(`/suppliers/${id}/categories`);
    if (!res.ok) return { ok: false };
    const json = (await res.json()) as { data?: Category[] };
    return { ok: true, categories: json.data ?? [] };
  } catch {
    return { ok: false };
  }
}

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

async function fetchProducts(
  id: string,
): Promise<{ ok: true; products: ClientProduct[] } | { ok: false }> {
  try {
    const res = await backendFetch(`/suppliers/${id}/products`);
    if (!res.ok) return { ok: false };
    const json = (await res.json()) as { data?: unknown };
    const arr = Array.isArray(json.data)
      ? json.data
      : Array.isArray((json as Record<string, unknown>).products)
        ? (json as Record<string, unknown>).products
        : [];

    if (!Array.isArray(arr)) return { ok: true, products: [] };

    const products: ClientProduct[] = [];
    for (const row of arr) {
      if (!row || typeof row !== "object") continue;
      const o = row as RawProduct;
      const merged: RawProduct =
        o.product && typeof o.product === "object"
          ? { ...(o.product as RawProduct), ...o }
          : o;

      const idRaw = merged.id;
      const id =
        typeof idRaw === "number"
          ? idRaw
          : typeof idRaw === "string"
            ? Number(idRaw)
            : NaN;
      if (!Number.isFinite(id)) continue;

      const categories = Array.isArray(merged.categories)
        ? (merged.categories as { id: number }[])
        : [];

      let price: string | null = formatWooStorePriceFromFields(
        merged.prices,
        "sale_first",
      );
      let regularPrice: string | null = formatWooStorePriceFromFields(
        merged.prices,
        "regular_only",
      );
      if (!price) price = str(merged.price);
      if (!regularPrice) regularPrice = str(merged.regular_price);

      products.push({ id, price, regularPrice, categories });
    }

    return { ok: true, products };
  } catch {
    return { ok: false };
  }
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
type Props = { params: Promise<{ locale: string; id: string }> };

export default async function SupplierCategoriesPage({ params }: Props) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const messages = getAppMessages(locale);

  const [supplierResult, categoriesResult, productsResult] = await Promise.all([
    fetchSupplier(id),
    fetchCategories(id),
    fetchProducts(id),
  ]);

  if (!supplierResult.ok) {
    if (supplierResult.status === 401) {
      redirect(`/${locale}/login?next=/${locale}/suppliers/${id}`);
    }
    notFound();
  }

  const supplier = supplierResult.supplier;
  const loadFailed = !categoriesResult.ok;
  const categories = categoriesResult.ok ? categoriesResult.categories : [];
  const products = productsResult.ok ? productsResult.products : [];

  const nameById: Record<number, string> = {};
  for (const c of categories) nameById[c.id] = c.name;

  /* Build children map for recursive count */
  const childrenByParent = new Map<number, Category[]>();
  for (const cat of categories) {
    const arr = childrenByParent.get(cat.parent) ?? [];
    arr.push(cat);
    childrenByParent.set(cat.parent, arr);
  }

  function totalCount(catId: number): number {
    const children = childrenByParent.get(catId) ?? [];
    const self = categories.find((c) => c.id === catId)?.count ?? 0;
    return self + children.reduce((sum, child) => sum + totalCount(child.id), 0);
  }

  const rootCategories = categories.filter((c) => c.parent === 0);

  const totalCountMap: Record<number, number> = {};
  for (const cat of rootCategories) {
    totalCountMap[cat.id] = totalCount(cat.id);
  }

  const clientCategories: ClientCategory[] = rootCategories.map((c) => ({
    id: c.id,
    name: c.name,
    parent: c.parent,
    count: c.count,
    image: c.image,
    images: c.images,
  }));

  return (
    <div className="mx-auto pb-12">
      {/* Breadcrumb / back */}
      <Link
        href={`/${locale}/suppliers`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-4 w-4 shrink-0 ${locale === "he" ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path
            d="M19 12H5M12 19l-7-7 7-7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {messages.supplierCategoriesBack}
      </Link>

      {/* Header */}
      <div className="mt-6 flex flex-wrap items-start gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-cyan-500 to-teal-600 text-base font-bold text-white shadow-sm ring-2 ring-white/40"
          aria-hidden
        >
          {supplier.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            {messages.supplierCategoriesTitle}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            {supplier.name}
          </h1>
          <p className="mt-1 text-sm text-muted">{supplier.url}</p>
        </div>
      </div>

      {/* Content */}
      <div className="mt-10">
        {loadFailed ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive">
            {messages.supplierCategoriesLoadError}
          </p>
        ) : rootCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/40 px-8 py-16 text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-12 w-12 text-muted/50"
              aria-hidden
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <p className="mt-4 max-w-sm text-sm text-muted">
              {messages.supplierCategoriesEmpty}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-muted">
              {messages.supplierCategoriesSubtitle}{" "}
              <span className="font-semibold text-foreground">
                ({rootCategories.length})
              </span>
            </p>
            <SupplierCategoriesClient
              rootCategories={clientCategories}
              products={products}
              messages={{
                storeCategoryProducts: messages.storeCategoryProducts,
                storeCategoryRoot: messages.storeCategoryRoot,
                storeCategoryParent: messages.storeCategoryParent,
                selectLabel: messages.selectLabel,
                selectedLabel: messages.selectedLabel,
                selectionTotal: messages.selectionTotal,
                selectionClear: messages.selectionClear,
                syncToStoreButton: messages.syncToStoreButton,
                syncModalTitle: messages.syncModalTitle,
                syncModalSelectStore: messages.syncModalSelectStore,
                syncModalSelectCategory: messages.syncModalSelectCategory,
                syncModalCreateRule: messages.syncModalCreateRule,
                syncModalSuccess: messages.syncModalSuccess,
                syncModalError: messages.syncModalError,
                syncModalLoadingStores: messages.syncModalLoadingStores,
                syncModalLoadingCategories: messages.syncModalLoadingCategories,
                syncModalNoStores: messages.syncModalNoStores,
                syncModalNoCategories: messages.syncModalNoCategories,
                confirmNo: messages.confirmNo,
              }}
              locale={locale}
              supplierId={id}
              nameById={nameById}
              totalCountMap={totalCountMap}
            />
          </>
        )}
      </div>
    </div>
  );
}
