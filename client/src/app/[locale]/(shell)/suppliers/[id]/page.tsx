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
type SupplierFullResponse = {
  supplier: Supplier;
  categories: Category[];
  products: unknown[];
};

async function fetchSupplierFull(
  id: string,
): Promise<
  { ok: true; data: SupplierFullResponse } | { ok: false; status: number }
> {
  try {
    const res = await backendFetch(`/suppliers/${id}/full`, {}, 30);
    if (!res.ok) return { ok: false, status: res.status };
    const json = (await res.json()) as { data: SupplierFullResponse };
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, status: 401 };
  }
}

async function fetchSupplierLogo(id: string): Promise<string | null> {
  try {
    const res = await backendFetch(`/suppliers/${id}/logo`);
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { logoUrl?: string | null } };
    return json.data?.logoUrl ?? null;
  } catch {
    return null;
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

  const [fullResult, logoUrl] = await Promise.all([
    fetchSupplierFull(id),
    fetchSupplierLogo(id),
  ]);

  if (!fullResult.ok) {
    if (fullResult.status === 401) {
      redirect(`/${locale}/login?next=/${locale}/suppliers/${id}`);
    }
    notFound();
  }

  const { supplier, categories } = fullResult.data;
  const rawProducts = fullResult.data.products;

  /* Map raw products to ClientProduct */
  const products: ClientProduct[] = [];
  for (const row of rawProducts) {
    if (!row || typeof row !== "object") continue;
    const o = row as RawProduct;
    const merged: RawProduct =
      o.product && typeof o.product === "object"
        ? { ...(o.product as RawProduct), ...o }
        : o;

    const idRaw = merged.id;
    const productId =
      typeof idRaw === "number"
        ? idRaw
        : typeof idRaw === "string"
          ? Number(idRaw)
          : NaN;
    if (!Number.isFinite(productId)) continue;

    const productCategories = Array.isArray(merged.categories)
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
    if (!price) {
      const v = merged.price;
      price =
        typeof v === "string" && v.trim()
          ? v.trim()
          : typeof v === "number" && Number.isFinite(v)
            ? String(v)
            : null;
    }
    if (!regularPrice) {
      const v = merged.regular_price;
      regularPrice =
        typeof v === "string" && v.trim()
          ? v.trim()
          : typeof v === "number" && Number.isFinite(v)
            ? String(v)
            : null;
    }

    products.push({
      id: productId,
      price,
      regularPrice,
      categories: productCategories,
    });
  }

  const nameById: Record<number, string> = {};
  for (const c of categories) nameById[c.id] = c.name;

  /* Build children map */
  const childrenByParent = new Map<number, Category[]>();
  for (const cat of categories) {
    const arr = childrenByParent.get(cat.parent) ?? [];
    arr.push(cat);
    childrenByParent.set(cat.parent, arr);
  }

  /* O(n) totalCount using a bottom-up Map instead of recursive .find */
  const countById = new Map<number, number>(
    categories.map((c) => [c.id, c.count ?? 0]),
  );
  function totalCount(catId: number): number {
    const children = childrenByParent.get(catId) ?? [];
    return (
      (countById.get(catId) ?? 0) +
      children.reduce((sum, child) => sum + totalCount(child.id), 0)
    );
  }

  const rootCategories = categories.filter((c) => c.parent === 0);

  const totalCountMap: Record<number, number> = {};
  for (const cat of rootCategories) {
    totalCountMap[cat.id] = totalCount(cat.id);
  }

  const loadFailed = false;

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
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl shadow-sm ring-2 ring-white/40">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={supplier.name}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-400 via-cyan-500 to-teal-600 text-base font-bold text-white">
              {supplier.name.slice(0, 2).toUpperCase()}
            </div>
          )}
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
                selectionPanelTitle: messages.selectionPanelTitle,
                selectionPanelCategoriesSection:
                  messages.selectionPanelCategoriesSection,
                selectionPanelProductsSection:
                  messages.selectionPanelProductsSection,
                selectionPanelEmpty: messages.selectionPanelEmpty,
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
