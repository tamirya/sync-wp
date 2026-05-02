import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { backendFetch } from "@/lib/backend-fetch";
import { getAppMessages } from "@/messages/app";
import { formatWooStorePriceFromFields } from "@/lib/mapping-tree-utils";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type WooImage = { id?: number; src?: string | null; alt?: string | null };

type WooCategory = { id: number; name?: string; slug?: string };

type RawProduct = Record<string, unknown>;

type ParsedProduct = {
  id: number;
  wooProductId: number;
  name: string;
  sku: string;
  price: string | null;
  regularPrice: string | null;
  salePrice: string | null;
  stockStatus: string | null;
  image: WooImage | null;
  permalink: string | null;
  categories: WooCategory[];
};

type Store = { id: number; name: string; url: string };

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
    const innerProduct =
      o.product && typeof o.product === "object"
        ? (o.product as RawProduct)
        : null;
    const merged: RawProduct = innerProduct ? { ...innerProduct, ...o } : o;

    const idRaw = merged.id;
    const id =
      typeof idRaw === "number"
        ? idRaw
        : typeof idRaw === "string"
          ? Number(idRaw)
          : NaN;
    if (!Number.isFinite(id)) continue;

    /* WooCommerce product ID — lives in the nested product object */
    const wooIdRaw = innerProduct?.id ?? idRaw;
    const wooProductId =
      typeof wooIdRaw === "number"
        ? wooIdRaw
        : typeof wooIdRaw === "string"
          ? Number(wooIdRaw)
          : id;

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

    out.push({
      id,
      wooProductId,
      name: str(merged.name) ?? `#${id}`,
      sku: str(merged.sku) ?? "",
      price,
      regularPrice,
      salePrice,
      stockStatus: str(merged.stock_status),
      image,
      permalink: str(merged.permalink),
      categories,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Data fetchers                                                       */
/* ------------------------------------------------------------------ */
async function fetchStore(
  id: string,
): Promise<{ ok: true; store: Store } | { ok: false; status: number }> {
  try {
    const res = await backendFetch(`/stores/${id}`);
    if (!res.ok) return { ok: false, status: res.status };
    const json = (await res.json()) as { data: Store };
    return { ok: true, store: json.data };
  } catch {
    return { ok: false, status: 401 };
  }
}

async function fetchCategories(
  storeId: string,
): Promise<{ ok: true; categories: CategoryInfo[] } | { ok: false }> {
  try {
    const res = await backendFetch(`/stores/${storeId}/categories`);
    if (!res.ok) return { ok: false };
    const json = (await res.json()) as { data?: CategoryInfo[] };
    return { ok: true, categories: json.data ?? [] };
  } catch {
    return { ok: false };
  }
}

async function fetchProducts(
  storeId: string,
): Promise<{ ok: true; products: ParsedProduct[] } | { ok: false }> {
  try {
    const res = await backendFetch(`/stores/${storeId}/products`);
    if (!res.ok) return { ok: false };
    const json = (await res.json()) as { data?: unknown };
    return { ok: true, products: parseWooProducts(json.data) };
  } catch {
    return { ok: false };
  }
}

/* ------------------------------------------------------------------ */
/*  Stock badge                                                         */
/* ------------------------------------------------------------------ */
function StockBadge({
  status,
  messages,
}: {
  status: string | null;
  messages: ReturnType<typeof getAppMessages>;
}) {
  if (!status) return null;
  const cfg = {
    instock: {
      label: messages.storeProductInStock,
      cls: "bg-green-100 text-green-700 ring-green-200",
    },
    outofstock: {
      label: messages.storeProductOutOfStock,
      cls: "bg-red-100 text-red-700 ring-red-200",
    },
    onbackorder: {
      label: messages.storeProductOnBackorder,
      cls: "bg-amber-100 text-amber-700 ring-amber-200",
    },
  }[status] ?? {
    label: status,
    cls: "bg-muted-bg text-muted ring-border/60",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Product card                                                        */
/* ------------------------------------------------------------------ */
function ProductCard({
  product,
  locale,
  storeId,
  messages,
}: {
  product: ParsedProduct;
  locale: string;
  storeId: string;
  messages: ReturnType<typeof getAppMessages>;
}) {
  const imgSrc = product.image?.src ?? null;
  const imgAlt = product.image?.alt || product.name;
  const hasSale =
    product.salePrice !== null &&
    product.regularPrice !== null &&
    product.salePrice !== product.regularPrice;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5">
      {/* Thumbnail */}
      <div className="relative h-44 w-full shrink-0 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={imgAlt}
            className="h-full w-full object-contain p-3 transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              className="h-14 w-14"
              aria-hidden
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-card-foreground">
            {product.name}
          </h3>
          {product.sku && (
            <p className="mt-0.5 font-mono text-[11px] text-muted">
              SKU: {product.sku}
            </p>
          )}
        </div>

        {/* Price */}
        {(product.price ?? product.regularPrice) && (
          <div className="flex flex-wrap items-center gap-2">
            {hasSale ? (
              <>
                <span className="text-base font-bold text-primary">
                  {product.salePrice} ש״ח
                </span>
                <span className="text-sm text-muted line-through">
                  {product.regularPrice} ש״ח
                </span>
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {messages.storeProductSalePrice}
                </span>
              </>
            ) : (
              <span className="text-base font-bold text-card-foreground">
                {product.price ?? product.regularPrice} ש״ח
              </span>
            )}
          </div>
        )}

        {/* Footer: stock + edit button */}
        <div className="mt-auto flex items-center justify-between gap-2">
          <StockBadge status={product.stockStatus} messages={messages} />
          <Link
            href={`/${locale}/stores/${storeId}/products/${product.wooProductId}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted-bg hover:border-primary/40 hover:text-primary"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-3.5 w-3.5 shrink-0"
              aria-hidden
            >
              <path
                d="M11.5 2.5a2.121 2.121 0 0 1 3 3L5 15l-4 1 1-4L11.5 2.5z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {messages.editLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-category card                                                   */
/* ------------------------------------------------------------------ */
const CARD_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-500",
  "from-red-500 to-orange-600",
  "from-cyan-500 to-sky-600",
  "from-lime-500 to-green-600",
  "from-sky-400 to-cyan-500",
];

function SubCategoryCard({
  category,
  href,
  messages,
  displayCount,
}: {
  category: CategoryInfo;
  href: string;
  messages: ReturnType<typeof getAppMessages>;
  displayCount?: number | null;
}) {
  const count =
    displayCount !== undefined ? displayCount : (category.count ?? null);
  const imgSrc =
    category.image?.src ??
    (Array.isArray(category.images) ? category.images[0]?.src : null) ??
    null;
  const imgAlt =
    category.image?.alt ??
    (Array.isArray(category.images) ? category.images[0]?.alt : null) ??
    category.name;
  const gradient = CARD_GRADIENTS[category.id % CARD_GRADIENTS.length];

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
    >
      {/* Gradient thumbnail */}
      <div
        className={`relative h-28 w-full shrink-0 overflow-hidden bg-gradient-to-br ${gradient}`}
      >
        <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
        <div className="absolute -left-3 bottom-0 h-14 w-14 rounded-full bg-white/10" />
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={imgAlt}
            className="h-full w-full object-cover opacity-90"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.25"
              className="h-10 w-10 opacity-90 drop-shadow-sm"
              aria-hidden
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="line-clamp-1 text-sm font-bold text-card-foreground group-hover:text-primary transition-colors">
          {category.name}
        </p>
        <div className="flex items-center justify-between">
          {count !== null ? (
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-primary leading-none">
                {count.toLocaleString()}
              </span>
              <span className="text-[11px] text-muted">
                {messages.storeCategoryProducts}
              </span>
            </div>
          ) : (
            <span />
          )}
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-white">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="h-3.5 w-3.5 shrink-0 rtl:rotate-180"
              aria-hidden
            >
              <path
                d="M9 18l6-6-6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
type Props = {
  params: Promise<{ locale: string; id: string; catId: string }>;
};

export default async function StoreCategoryProductsPage({ params }: Props) {
  const { locale: raw, id, catId } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const messages = getAppMessages(locale);

  const catIdNum = Number(catId);
  if (!Number.isFinite(catIdNum)) notFound();

  const [storeResult, categoriesResult, productsResult] = await Promise.all([
    fetchStore(id),
    fetchCategories(id),
    fetchProducts(id),
  ]);

  if (!storeResult.ok) {
    if (storeResult.status === 401) {
      redirect(`/${locale}/login?next=/${locale}/stores/${id}`);
    }
    notFound();
  }

  const store = storeResult.store;
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
  function totalCount(catId: number): number {
    const children = childrenByParent.get(catId) ?? [];
    const self = allCategories.find((c) => c.id === catId)?.count ?? 0;
    return (
      self + children.reduce((sum, child) => sum + totalCount(child.id), 0)
    );
  }

  /* Collect this category + all its descendants */
  function collectDescendantIds(catId: number): Set<number> {
    const ids = new Set<number>([catId]);
    const queue = [catId];
    while (queue.length) {
      const cur = queue.pop()!;
      for (const child of childrenByParent.get(cur) ?? []) {
        if (!ids.has(child.id)) {
          ids.add(child.id);
          queue.push(child.id);
        }
      }
    }
    return ids;
  }
  const categorySubtreeIds = collectDescendantIds(catIdNum);

  /* Products belonging to this category OR any of its descendants */
  const loadFailed = !productsResult.ok;
  const allProducts = productsResult.ok ? productsResult.products : [];
  const products = allProducts.filter((p) =>
    p.categories.some((c) => categorySubtreeIds.has(c.id)),
  );

  return (
    <div className="mx-auto pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <Link
          href={`/${locale}/stores`}
          className="font-semibold text-primary hover:underline"
        >
          {messages.storeCategoriesBack}
        </Link>
        <span className="text-muted/60">/</span>
        <Link
          href={`/${locale}/stores/${id}`}
          className="font-semibold text-primary hover:underline"
        >
          {store.name}
        </Link>
        {ancestors.map((anc) => (
          <>
            <span key={`sep-${anc.id}`} className="text-muted/60">
              /
            </span>
            <Link
              key={anc.id}
              href={`/${locale}/stores/${id}/categories/${anc.id}`}
              className="font-semibold text-primary hover:underline"
            >
              {anc.name}
            </Link>
          </>
        ))}
        <span className="text-muted/60">/</span>
        <span className="truncate text-muted">{category?.name ?? catId}</span>
      </div>

      {/* Header */}
      <div className="mt-6 flex flex-wrap items-start gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-400 via-slate-500 to-slate-700 shadow-sm ring-2 ring-white/40"
          aria-hidden
        >
          {category?.image?.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={category.image.src}
              alt={category.image.alt ?? category.name}
              className="h-full w-full object-cover"
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
            {messages.storeCategoriesTitle}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            {category?.name ?? catId}
          </h1>
          <p className="mt-1 text-sm text-muted">{store.name}</p>
        </div>
      </div>

      {/* Sub-categories section */}
      {subCategories.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted">
            {messages.storeCategorySubcategoriesTitle}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {subCategories.map((sub) => (
              <SubCategoryCard
                key={sub.id}
                category={sub}
                href={`/${locale}/stores/${id}/categories/${sub.id}`}
                messages={messages}
                displayCount={totalCount(sub.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Products section */}
      <section className="mt-10">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted">
          {messages.storeCategoryProductsTitle}{" "}
          {!loadFailed && (
            <span className="font-semibold text-foreground normal-case tracking-normal">
              ({products.length})
            </span>
          )}
        </h2>

        {loadFailed ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive">
            {messages.storeCategoryProductsLoadError}
          </p>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/40 px-8 py-16 text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-12 w-12 text-muted/50"
              aria-hidden
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p className="mt-4 max-w-sm text-sm text-muted">
              {messages.storeCategoryProductsEmpty}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                locale={locale}
                storeId={id}
                messages={messages}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
