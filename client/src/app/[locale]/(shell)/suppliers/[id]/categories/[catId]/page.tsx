import React from "react";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { backendFetch } from "@/lib/backend-fetch";
import { getAppMessages, pickPriceOverrideMessages } from "@/messages/app";
import { formatWooStorePriceFromFields } from "@/lib/mapping-tree-utils";
import {
  SupplierCatPageClient,
  type ClientSubCategory,
  type ClientProduct,
} from "./supplier-catpage-client";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type WooImage = { id?: number; src?: string | null; alt?: string | null };

type WooCategory = { id: number; name?: string; slug?: string };

type RawProduct = Record<string, unknown>;

type ParsedProduct = ClientProduct & {
  categories: WooCategory[];
};

type Supplier = { id: number; name: string; url: string };

type CategoryInfo = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count?: number;
  image?: { src?: string | null; alt?: string | null } | null;
  images?: { src?: string | null; alt?: string | null }[] | null;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function parseWooProducts(data: unknown): ParsedProduct[] {
  if (!Array.isArray(data)) return [];
  const out: ParsedProduct[] = [];
  for (const row of data) {
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

    const images = Array.isArray(merged.images)
      ? (merged.images as WooImage[])
      : [];
    const image = images[0] ?? null;

    const categories = Array.isArray(merged.categories)
      ? (merged.categories as WooCategory[])
      : [];

    let price: string | null = formatWooStorePriceFromFields(
      merged.prices,
      "sale_first",
    );
    let regularPrice: string | null = formatWooStorePriceFromFields(
      merged.prices,
      "regular_only",
    );
    let salePrice: string | null = null;
    if (merged.prices && typeof merged.prices === "object") {
      const p = merged.prices as Record<string, unknown>;
      if (p.sale_price !== null && p.sale_price !== undefined) {
        salePrice = formatWooStorePriceFromFields(
          { ...p, price: p.sale_price },
          "sale_first",
        );
      }
    }
    if (!price) price = str(merged.price);
    if (!regularPrice) regularPrice = str(merged.regular_price);
    if (!salePrice) salePrice = str(merged.sale_price);

    const stockAvailabilityText =
      merged.stock_availability && typeof merged.stock_availability === "object"
        ? str((merged.stock_availability as Record<string, unknown>).text)
        : null;

    out.push({
      id,
      name: str(merged.name) ?? `#${id}`,
      sku: str(merged.sku) ?? "",
      price,
      regularPrice,
      salePrice,
      stockStatus: str(merged.stock_status),
      stockAvailabilityText,
      image,
      permalink: str(merged.permalink),
      categories,
    });
  }
  return out;
}

type PriceOverrideRaw = {
  type: "product" | "category";
  targetId: number;
  markupPercent: number;
  useSalePrices: boolean;
};

/* ------------------------------------------------------------------ */
/*  Data fetchers                                                       */
/* ------------------------------------------------------------------ */
async function fetchPriceOverrides(
  supplierId: string,
): Promise<PriceOverrideRaw[]> {
  try {
    const res = await backendFetch(
      `/suppliers/${supplierId}/price-overrides`,
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: PriceOverrideRaw[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

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
  supplierId: string,
): Promise<{ ok: true; categories: CategoryInfo[] } | { ok: false }> {
  try {
    const res = await backendFetch(`/suppliers/${supplierId}/categories`);
    if (!res.ok) return { ok: false };
    const json = (await res.json()) as { data?: CategoryInfo[] };
    return { ok: true, categories: json.data ?? [] };
  } catch {
    return { ok: false };
  }
}

const PRODUCTS_PER_PAGE = 24;

type ProductsPage = {
  products: ParsedProduct[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

async function fetchProducts(
  supplierId: string,
  categoryId: number,
  page: number,
): Promise<{ ok: true } & ProductsPage | { ok: false }> {
  try {
    const params = new URLSearchParams({
      categoryId: String(categoryId),
      page: String(page),
      perPage: String(PRODUCTS_PER_PAGE),
    });
    const res = await backendFetch(`/suppliers/${supplierId}/products?${params}`);
    if (!res.ok) return { ok: false };
    const json = (await res.json()) as { data?: { products?: unknown[]; total?: number; page?: number; perPage?: number; totalPages?: number } };
    const d = json.data ?? {};
    return {
      ok: true,
      products: parseWooProducts(d.products ?? []),
      total: d.total ?? 0,
      page: d.page ?? page,
      perPage: d.perPage ?? PRODUCTS_PER_PAGE,
      totalPages: d.totalPages ?? 1,
    };
  } catch {
    return { ok: false };
  }
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
type Props = {
  params: Promise<{ locale: string; id: string; catId: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function SupplierCategoryProductsPage({ params, searchParams }: Props) {
  const { locale: raw, id, catId } = await params;
  const { page: pageParam } = await searchParams;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const messages = getAppMessages(locale);

  const catIdNum = Number(catId);
  if (!Number.isFinite(catIdNum)) notFound();

  const currentPage = Math.max(Number(pageParam ?? "1") || 1, 1);

  const [supplierResult, categoriesResult, productsResult, priceOverrides] =
    await Promise.all([
      fetchSupplier(id),
      fetchCategories(id),
      fetchProducts(id, catIdNum, currentPage),
      fetchPriceOverrides(id),
    ]);

  const productOverrideMap = new Map<
    number,
    { markupPercent: number; useSalePrices: boolean }
  >();
  const categoryOverrideMap = new Map<
    number,
    { markupPercent: number; useSalePrices: boolean }
  >();
  for (const o of priceOverrides) {
    const val = {
      markupPercent: Number(o.markupPercent),
      useSalePrices: o.useSalePrices !== false,
    };
    if (o.type === "product") productOverrideMap.set(o.targetId, val);
    else categoryOverrideMap.set(o.targetId, val);
  }

  if (!supplierResult.ok) {
    if (supplierResult.status === 401) {
      redirect(`/${locale}/login?next=/${locale}/suppliers/${id}`);
    }
    notFound();
  }

  const supplier = supplierResult.supplier;
  const allCategories = categoriesResult.ok ? categoriesResult.categories : [];

  const category = allCategories.find((c) => c.id === catIdNum) ?? null;

  /* Build full ancestor chain from root → direct parent */
  function buildAncestors(catId: number): CategoryInfo[] {
    const chain: CategoryInfo[] = [];
    let cur = allCategories.find((c) => c.id === catId);
    while (cur && cur.parent !== 0) {
      const parent = allCategories.find((c) => c.id === cur!.parent);
      if (!parent) break;
      chain.unshift(parent);
      cur = parent;
    }
    return chain;
  }
  const ancestors = buildAncestors(catIdNum);

  /* Sub-categories of the current category */
  const subCategories = allCategories.filter((c) => c.parent === catIdNum);

  /* Recursive total count (self + all descendants) */
  const childrenByParent = new Map<number, CategoryInfo[]>();
  for (const cat of allCategories) {
    const arr = childrenByParent.get(cat.parent) ?? [];
    arr.push(cat);
    childrenByParent.set(cat.parent, arr);
  }
  function totalCount(cId: number): number {
    const children = childrenByParent.get(cId) ?? [];
    const self = allCategories.find((c) => c.id === cId)?.count ?? 0;
    return (
      self + children.reduce((sum, child) => sum + totalCount(child.id), 0)
    );
  }

  /* Products — already filtered by categoryId on the server */
  const loadFailed = !productsResult.ok;
  const products = productsResult.ok ? productsResult.products : [];
  const totalProducts = productsResult.ok ? productsResult.total : 0;
  const totalPages = productsResult.ok ? productsResult.totalPages : 1;

  return (
    <div className="mx-auto pb-12">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href={`/${locale}/suppliers`}
          className="font-semibold text-primary hover:underline"
        >
          {messages.supplierCategoriesBack}
        </Link>
        <span className="text-muted/60">/</span>
        <Link
          href={`/${locale}/suppliers/${id}`}
          className="font-semibold text-primary hover:underline"
        >
          {supplier.name}
        </Link>
        {ancestors.map((anc) => (
          <React.Fragment key={anc.id}>
            <span className="text-muted/60">/</span>
            <Link
              href={`/${locale}/suppliers/${id}/categories/${anc.id}`}
              className="font-semibold text-primary hover:underline"
            >
              {anc.name}
            </Link>
          </React.Fragment>
        ))}
        <span className="text-muted/60">/</span>
        <span className="truncate text-muted">{category?.name ?? catId}</span>
      </div>

      {/* Header */}
      <div className="mt-6 flex flex-wrap items-start gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-cyan-500 to-teal-600 shadow-sm ring-2 ring-white/40"
          aria-hidden
        >
          {category?.image?.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={category.image.src}
              alt={category.image.alt ?? category.name}
              className="h-full w-full object-cover rounded-2xl"
            />
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              className="h-7 w-7"
              aria-hidden
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            {messages.supplierCategoriesTitle}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            {category?.name ?? catId}
          </h1>
          <p className="mt-1 text-sm text-muted">{supplier.name}</p>
        </div>
      </div>

      <SupplierCatPageClient
        currentCategoryName={category?.name}
        categoryPath={[
          ...ancestors.map((a) => a.name),
          ...(category?.name ? [category.name] : []),
        ]}
        subCategories={subCategories.map(
          (sub): ClientSubCategory => ({
            id: sub.id,
            name: sub.name,
            parent: sub.parent,
            count: sub.count,
            image: sub.image,
            images: sub.images,
            href: `/${locale}/suppliers/${id}/categories/${sub.id}`,
            displayCount: totalCount(sub.id),
            priceOverride: categoryOverrideMap.get(sub.id) ?? null,
          }),
        )}
        products={products.map((p) => ({
          ...p,
          priceOverride: productOverrideMap.get(p.id) ?? null,
        }))}
        totalProducts={totalProducts}
        currentPage={currentPage}
        totalPages={totalPages}
        loadFailed={loadFailed}
        locale={locale}
        supplierId={Number(id)}
        messages={{
          storeCategoryProducts: messages.storeCategoryProducts,
          storeCategorySubcategoriesTitle:
            messages.storeCategorySubcategoriesTitle,
          storeCategoryProductsTitle: messages.storeCategoryProductsTitle,
          storeCategoryProductsEmpty: messages.storeCategoryProductsEmpty,
          storeCategoryProductsLoadError:
            messages.storeCategoryProductsLoadError,
          storeProductInStock: messages.storeProductInStock,
          storeProductOutOfStock: messages.storeProductOutOfStock,
          storeProductOnBackorder: messages.storeProductOnBackorder,
          storeProductSalePrice: messages.storeProductSalePrice,
          supplierCategoryProductsViewLabel:
            messages.supplierCategoryProductsViewLabel,
          selectLabel: messages.selectLabel,
          selectedLabel: messages.selectedLabel,
          selectionTotal: messages.selectionTotal,
          selectionClear: messages.selectionClear,
          selectionPanelTitle: messages.selectionPanelTitle,
          selectionPanelCategoriesSection:
            messages.selectionPanelCategoriesSection,
          selectionPanelProductsSection: messages.selectionPanelProductsSection,
          selectionPanelEmpty: messages.selectionPanelEmpty,
          syncToStoreButton: messages.syncToStoreButton,
          syncModalTitle: messages.syncModalTitle,
          syncModalSelectStore: messages.syncModalSelectStore,
          syncModalSelectCategory: messages.syncModalSelectCategory,
          syncModalCreateRule: messages.syncModalCreateRule,
          syncModalSuccess: messages.syncModalSuccess,
          syncModalError: messages.syncModalError,
          syncModalDuplicateRuleError: messages.syncModalDuplicateRuleError,
          syncModalLoadingStores: messages.syncModalLoadingStores,
          syncModalLoadingCategories: messages.syncModalLoadingCategories,
          syncModalNoStores: messages.syncModalNoStores,
          syncModalNoCategories: messages.syncModalNoCategories,
          confirmNo: messages.confirmNo,
          priceOverrideButton: messages.priceOverrideButton,
          ...pickPriceOverrideMessages(messages),
        }}
      />
    </div>
  );
}
