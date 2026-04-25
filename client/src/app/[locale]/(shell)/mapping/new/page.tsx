import type { Locale } from "@/i18n/config";
import { isLocale } from "@/i18n/config";
import {
  fetchStoreCategoriesForMapping,
  fetchStoreProductsForMapping,
  fetchSupplierCategoriesForMapping,
  fetchSupplierProductsForMapping,
} from "@/lib/mapping-api";
import { buildCategoryTree } from "@/lib/mapping-tree-utils";
import type { MappingCategoryNode, MappingProductRow } from "@/lib/mapping-tree-utils";
import { fetchStoresForUser } from "@/lib/stores-api";
import { fetchSuppliersForUser } from "@/lib/suppliers-api";
import { getAppMessages } from "@/messages/app";
import { notFound, redirect } from "next/navigation";
import { NewMappingView } from "./new-mapping-view";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    type?: string | string[];
    store?: string | string[];
    supplier?: string | string[];
  }>;
};

function firstParam(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.length > 0) return v[0];
  return undefined;
}

export default async function NewMappingPage({ params, searchParams }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const messages = getAppMessages(locale);

  const sp = await searchParams;
  const typeParam = firstParam(sp.type) ?? "category";
  const addMode = typeParam === "product" ? "product" : "category";
  const storeParam = firstParam(sp.store);
  const supplierParam = firstParam(sp.supplier);

  const [storesResult, suppliersResult] = await Promise.all([
    fetchStoresForUser(),
    fetchSuppliersForUser(),
  ]);

  if (storesResult.ok === false && storesResult.status === 401) {
    redirect(`/${locale}/login?next=/${locale}/mapping`);
  }
  if (suppliersResult.ok === false && suppliersResult.status === 401) {
    redirect(`/${locale}/login?next=/${locale}/mapping`);
  }

  const stores = storesResult.ok ? storesResult.stores : [];
  const suppliers = suppliersResult.ok ? suppliersResult.suppliers : [];

  const storeIds = new Set(stores.map((s) => s.id));
  const supplierIds = new Set(suppliers.map((s) => s.id));

  const selectedStoreId =
    storeParam && storeIds.has(storeParam) ? storeParam : null;
  const selectedSupplierId =
    supplierParam && supplierIds.has(supplierParam) ? supplierParam : null;

  let storeTree: MappingCategoryNode[] = [];
  let storeProducts: MappingProductRow[] = [];
  let supplierTree: MappingCategoryNode[] = [];
  let supplierProducts: MappingProductRow[] = [];
  let catalogLoadFailed = false;

  if (selectedStoreId && selectedSupplierId) {
    const [sc, spv, suc, sup] = await Promise.all([
      fetchStoreCategoriesForMapping(selectedStoreId),
      fetchStoreProductsForMapping(selectedStoreId),
      fetchSupplierCategoriesForMapping(selectedSupplierId),
      fetchSupplierProductsForMapping(selectedSupplierId),
    ]);

    if (sc.ok && spv.ok && suc.ok && sup.ok) {
      storeTree = buildCategoryTree(sc.categories);
      storeProducts = spv.products;
      supplierTree = buildCategoryTree(suc.categories);
      supplierProducts = sup.products;
    } else {
      catalogLoadFailed = true;
    }
  }

  return (
    <div className="mx-auto pb-12">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
        {messages.mappingBreadcrumb}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
        {messages.mappingNewPageTitle}
      </h1>
      <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted">
        {messages.mappingNewPageSubtitle}
      </p>

      <div className="mt-8">
        <NewMappingView
          locale={locale}
          messages={messages}
          addMode={addMode}
          stores={stores.map((s) => ({ id: s.id, name: s.name }))}
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          selectedStoreId={selectedStoreId}
          selectedSupplierId={selectedSupplierId}
          storeTree={storeTree}
          storeProducts={storeProducts}
          supplierTree={supplierTree}
          supplierProducts={supplierProducts}
          catalogLoadFailed={catalogLoadFailed}
        />
      </div>
    </div>
  );
}
