import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { notFound, redirect } from "next/navigation";
import { backendFetch } from "@/lib/backend-fetch";
import { getAppMessages } from "@/messages/app";

type CategoryImage = {
  src?: string | null;
  alt?: string | null;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count?: number;
  /** WC REST v3: single image object */
  image?: CategoryImage | null;
  /** WC Store API: array of images */
  images?: CategoryImage[] | null;
};

type Store = {
  id: number;
  name: string;
  url: string;
};

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
  id: string,
): Promise<{ ok: true; categories: Category[] } | { ok: false }> {
  try {
    const res = await backendFetch(`/stores/${id}/categories`);
    if (!res.ok) return { ok: false };
    const json = (await res.json()) as { data?: Category[] };
    return { ok: true, categories: json.data ?? [] };
  } catch {
    return { ok: false };
  }
}

/** Fetch all products just to extract their category assignments. */
async function fetchProductCategoryIds(
  id: string,
): Promise<{ ok: true; catIds: number[][] } | { ok: false }> {
  try {
    const res = await backendFetch(`/stores/${id}/products`);
    if (!res.ok) return { ok: false };
    const json = (await res.json()) as { data?: unknown };
    const arr = Array.isArray(json.data) ? json.data : [];
    const catIds: number[][] = [];
    for (const row of arr) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const merged =
        o.product && typeof o.product === "object"
          ? { ...(o.product as Record<string, unknown>), ...o }
          : o;
      const cats = Array.isArray(merged.categories)
        ? (merged.categories as { id?: unknown }[])
            .map((c) => Number(c.id))
            .filter((n) => Number.isFinite(n))
        : [];
      if (cats.length) catIds.push(cats);
    }
    return { ok: true, catIds };
  } catch {
    return { ok: false };
  }
}

/* ------------------------------------------------------------------ */
/*  Category card                                                        */
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

function CategoryCard({
  category,
  parentName,
  messages,
  href,
  displayCount,
}: {
  category: Category;
  parentName: string | null;
  messages: ReturnType<typeof getAppMessages>;
  href: string;
  displayCount?: number | null;
}) {
  const isRoot = category.parent === 0;
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
      {/* Thumbnail */}
      <div
        className={`relative h-32 w-full shrink-0 overflow-hidden bg-gradient-to-br ${gradient}`}
      >
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={imgAlt}
            className="h-full w-full object-cover opacity-90"
          />
        ) : (
          <>
            {/* Decorative circles */}
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
            <div className="absolute -left-3 bottom-0 h-14 w-14 rounded-full bg-white/10" />
            <div className="flex h-full w-full items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.25"
                className="h-12 w-12 opacity-90 drop-shadow-sm"
                aria-hidden
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          </>
        )}
        {/* Root / sub badge on image */}
        <span className="absolute left-2.5 top-2.5 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          {isRoot
            ? messages.storeCategoryRoot
            : (parentName ?? messages.storeCategoryParent)}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 text-sm font-bold text-card-foreground group-hover:text-primary transition-colors">
          {category.name}
        </h3>

        <div className="mt-auto flex items-center justify-between pt-1">
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
/*  Page                                                                 */
/* ------------------------------------------------------------------ */
type Props = { params: Promise<{ locale: string; id: string }> };

export default async function StoreCategoriesPage({ params }: Props) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const messages = getAppMessages(locale);

  const [storeResult, categoriesResult, productCatResult] = await Promise.all([
    fetchStore(id),
    fetchCategories(id),
    fetchProductCategoryIds(id),
  ]);

  if (!storeResult.ok) {
    if (storeResult.status === 401) {
      redirect(`/${locale}/login?next=/${locale}/stores/${id}`);
    }
    notFound();
  }

  const store = storeResult.store;
  const loadFailed = !categoriesResult.ok;
  const categories = categoriesResult.ok ? categoriesResult.categories : [];

  /* build parent name lookup */
  const nameById = new Map(categories.map((c) => [c.id, c.name]));

  /* build children map for recursive count */
  const childrenByParent = new Map<number, Category[]>();
  for (const cat of categories) {
    const arr = childrenByParent.get(cat.parent) ?? [];
    arr.push(cat);
    childrenByParent.set(cat.parent, arr);
  }

  /* Build direct product count per category from actual product data */
  const directCountByCatId = new Map<number, number>();
  if (productCatResult.ok) {
    for (const catIds of productCatResult.catIds) {
      for (const catId of catIds) {
        directCountByCatId.set(catId, (directCountByCatId.get(catId) ?? 0) + 1);
      }
    }
  }

  /* Recursive total = direct products + all descendant products */
  function totalCount(catId: number): number {
    const children = childrenByParent.get(catId) ?? [];
    const self = productCatResult.ok
      ? (directCountByCatId.get(catId) ?? 0)
      : (categories.find((c) => c.id === catId)?.count ?? 0);
    return (
      self + children.reduce((sum, child) => sum + totalCount(child.id), 0)
    );
  }

  /* show only root categories on the first level */
  const rootCategories = categories.filter((c) => c.parent === 0);

  return (
    <div className="mx-auto pb-12">
      {/* Breadcrumb / back */}
      <Link
        href={`/${locale}/stores`}
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
        {messages.storeCategoriesBack}
      </Link>

      {/* Header */}
      <div className="mt-6 flex flex-wrap items-start gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 text-base font-bold text-white shadow-sm ring-2 ring-white/40"
          aria-hidden
        >
          {store.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            {messages.storeCategoriesTitle}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            {store.name}
          </h1>
          <p className="mt-1 text-sm text-muted">{store.url}</p>
        </div>
      </div>

      {/* Content */}
      <div className="mt-10">
        {loadFailed ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive">
            {messages.storeCategoriesLoadError}
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
              {messages.storeCategoriesEmpty}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-muted">
              {messages.storeCategoriesSubtitle}{" "}
              <span className="font-semibold text-foreground">
                ({rootCategories.length})
              </span>
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rootCategories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  parentName={
                    cat.parent !== 0 ? (nameById.get(cat.parent) ?? null) : null
                  }
                  messages={messages}
                  href={`/${locale}/stores/${id}/categories/${cat.id}`}
                  displayCount={totalCount(cat.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
