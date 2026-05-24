import type { Locale } from "@/i18n/config";
import { isLocale } from "@/i18n/config";
import {
  fetchMappingRules,
  fetchProductMappingRules,
  fetchStoreCategoriesForMapping,
  fetchSupplierCategoriesForMapping,
  fetchSupplierProductsForMapping,
  type MappingRule,
  type ProductMappingRule,
  type SupplierProductInfo,
} from "@/lib/mapping-api";
import { backendFetch } from "@/lib/backend-fetch";
import { fetchStoresForUser } from "@/lib/stores-api";
import { fetchSuppliersForUser } from "@/lib/suppliers-api";
import { getAppMessages } from "@/messages/app";
import { notFound, redirect } from "next/navigation";
import { MappingView } from "./mapping-view";
import { SyncMappingButton } from "./sync-mapping-button";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function MappingPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) {
    notFound();
  }
  const locale = raw as Locale;
  const messages = getAppMessages(locale);

  const [storesResult, suppliersResult, rulesResult, productRulesResult] =
    await Promise.all([
      fetchStoresForUser(),
      fetchSuppliersForUser(),
      fetchMappingRules(),
      fetchProductMappingRules(),
    ]);

  if (storesResult.ok === false && storesResult.status === 401) {
    redirect(`/${locale}/login?next=/${locale}/mapping`);
  }
  if (suppliersResult.ok === false && suppliersResult.status === 401) {
    redirect(`/${locale}/login?next=/${locale}/mapping`);
  }

  const stores = storesResult.ok ? storesResult.stores : [];
  const suppliers = suppliersResult.ok ? suppliersResult.suppliers : [];

  const listLoadFailed =
    (!storesResult.ok && storesResult.status !== 401) ||
    (!suppliersResult.ok && suppliersResult.status !== 401);

  const mappingRules: MappingRule[] = rulesResult.ok ? rulesResult.rules : [];
  const rulesLoadFailed =
    !rulesResult.ok &&
    rulesResult.status !== 401 &&
    rulesResult.status !== 404;

  const productMappingRules: ProductMappingRule[] = productRulesResult.ok
    ? productRulesResult.rules
    : [];
  const productRulesLoadFailed =
    !productRulesResult.ok &&
    productRulesResult.status !== 401 &&
    productRulesResult.status !== 404;

  const syncStoreIds = [
    ...new Set([
      ...mappingRules.map((r) => r.storeId),
      ...productMappingRules.map((r) => r.storeId),
    ]),
  ];

  // Collect unique store/supplier IDs referenced by the rules so we can
  // enrich the display with real names instead of raw IDs.
  const rulesStoreIds = syncStoreIds;
  const rulesSupplierIds = [
    ...new Set([
      ...mappingRules.map((r) => r.supplierId),
      ...productMappingRules.map((r) => r.supplierId),
    ]),
  ];

  type PriceOverrideEntry = {
    type: string;
    targetId: number;
    markupPercent: number;
    useSalePrices: boolean;
  };

  type SupplierOverrides = {
    supplierId: number;
    products: Map<number, string>;
    categories: Map<number, string>;
  };

  async function fetchOverridesForSupplier(
    supplierId: number,
  ): Promise<SupplierOverrides> {
    const products = new Map<number, string>();
    const categories = new Map<number, string>();
    try {
      const res = await backendFetch(
        `/suppliers/${supplierId}/price-overrides`,
      );
      if (!res.ok) return { supplierId, products, categories };
      const json = (await res.json()) as { data?: PriceOverrideEntry[] };
      for (const o of json.data ?? []) {
        const pct = Number(o.markupPercent);
        const label = pct > 0 ? `+${pct}%` : `${pct}%`;
        if (o.type === "product") products.set(o.targetId, label);
        else if (o.type === "category") categories.set(o.targetId, label);
      }
    } catch {}
    return { supplierId, products, categories };
  }

  const [storeCatResults, supplierCatResults, supplierProdResults, overrideResults] =
    await Promise.all([
      Promise.all(
        rulesStoreIds.map((id) => fetchStoreCategoriesForMapping(String(id))),
      ),
      Promise.all(
        rulesSupplierIds.map((id) =>
          fetchSupplierCategoriesForMapping(String(id)),
        ),
      ),
      Promise.all(
        rulesSupplierIds.map((id) =>
          fetchSupplierProductsForMapping(String(id)),
        ),
      ),
      Promise.all(rulesSupplierIds.map((id) => fetchOverridesForSupplier(id))),
    ]);

  // Build lookups: `${supplierId}_${id}` → formatted price string
  const productPriceOverrideMap = new Map<string, string>();
  const categoryPriceOverrideMap = new Map<string, string>();
  for (const { supplierId, products, categories } of overrideResults) {
    for (const [productId, price] of products) {
      productPriceOverrideMap.set(`${supplierId}_${productId}`, price);
    }
    for (const [categoryId, price] of categories) {
      categoryPriceOverrideMap.set(`${supplierId}_${categoryId}`, price);
    }
  }

  const storeCategoryMap: Record<number, string> = {};
  for (const r of storeCatResults) {
    if (r.ok) r.categories.forEach((c) => { storeCategoryMap[c.id] = c.name; });
  }

  const supplierCategoryMap: Record<number, string> = {};
  const supplierCategoryCountMap: Record<number, number> = {};
  for (const r of supplierCatResults) {
    if (r.ok) {
      const cats = r.categories;
      cats.forEach((c) => { supplierCategoryMap[c.id] = c.name; });

      /* Recursive total count (self + all descendants) */
      const childrenByParent = new Map<number, number[]>();
      for (const cat of cats) {
        const arr = childrenByParent.get(cat.parent) ?? [];
        arr.push(cat.id);
        childrenByParent.set(cat.parent, arr);
      }
      const selfCount = new Map(cats.map((c) => [c.id, c.count ?? 0]));
      function totalCount(id: number): number {
        const children = childrenByParent.get(id) ?? [];
        return (selfCount.get(id) ?? 0) +
          children.reduce((sum, childId) => sum + totalCount(childId), 0);
      }
      for (const cat of cats) {
        supplierCategoryCountMap[cat.id] = totalCount(cat.id);
      }
    }
  }

  const supplierProductMap: Record<number, SupplierProductInfo> = {};
  for (let i = 0; i < supplierProdResults.length; i++) {
    const supplierId = rulesSupplierIds[i];
    const r = supplierProdResults[i];
    if (r.ok) {
      r.products.forEach((p) => {
        const overridePrice =
          productPriceOverrideMap.get(`${supplierId}_${p.id}`) ?? null;
        supplierProductMap[p.id] = {
          name: p.name,
          sku: p.sku,
          price: overridePrice ?? p.price,
          isOverridden: overridePrice != null,
        };
      });
    }
  }

  // Fill in any products referenced by rules that weren't in the bulk fetch,
  // using embedded info from the rule payload if available.
  for (const rule of productMappingRules) {
    if (!supplierProductMap[rule.sourceProductId] && rule.embeddedProduct) {
      supplierProductMap[rule.sourceProductId] = {
        name: rule.embeddedProduct.name ?? `#${rule.sourceProductId}`,
        sku: rule.embeddedProduct.sku ?? "",
        price: null,
      };
    }
  }

  return (
    <div className="mx-auto pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            {messages.mappingBreadcrumb}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
            {messages.mappingTitle}
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted">
            {messages.mappingSubtitle}
          </p>
        </div>
        <div className="mt-4 shrink-0 sm:mt-6">
          <SyncMappingButton
            locale={locale}
            messages={messages}
            storeIds={syncStoreIds}
          />
        </div>
      </div>

      {listLoadFailed ? (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive">
          {messages.mappingListsLoadError}
        </p>
      ) : null}

      <div className="mt-8">
        <MappingView
          locale={locale}
          messages={messages}
          stores={stores.map((s) => ({ id: s.id, name: s.name }))}
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          mappingRules={mappingRules}
          rulesLoadFailed={rulesLoadFailed}
          productMappingRules={productMappingRules}
          productRulesLoadFailed={productRulesLoadFailed}
          storeCategoryMap={storeCategoryMap}
          supplierCategoryMap={supplierCategoryMap}
          supplierCategoryCountMap={supplierCategoryCountMap}
          supplierProductMap={supplierProductMap}
          categoryPriceOverrideMap={Object.fromEntries(categoryPriceOverrideMap)}
        />
      </div>
    </div>
  );
}
