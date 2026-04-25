import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import { col, fn, Op } from 'sequelize';
import { ImportStoreProductsDto } from '@dtos/import-store-products.dto';
import { SyncStoreRulesImportDto } from '@dtos/sync-store-rules-import.dto';
import { CreateStoreDto } from '@dtos/stores.dto';
import { HttpException } from '@exceptions/HttpException';
import { Store, StoreProductCategory, StoreSummary, StoreWooProduct } from '@interfaces/stores.interface';
import CategoryRuleModel from '@models/categoryRules.model';
import ProductCategoryRuleModel from '@models/productCategoryRules.model';
import StoreModel from '@models/stores.model';
import StoreCatalogModel from '@models/storeCatalog.model';
import SupplierModel from '@models/suppliers.model';
import StoreCategoryModel from '@models/storeCategory.model';
import SupplierCatalogModel from '@models/supplierCatalog.model';
import EnvToStoreService from '@services/envToStore.service';
import SupplierService from '@services/suppliers.service';
import CategoryRulesService from '@services/category-rules.service';
import {
  importFromSupplierCatalogWithRuleResolution,
  importPage,
  ImportPageCategoryOptions,
  ImportRuleResolution,
  STORE_API_IMPORT_PER_PAGE,
  storeApiProductFromSupplierCatalogRow,
  StoreApiImportResult,
  StoreRulesSyncImportResult,
} from '@services/store-catalog.service';
import { isEmpty } from '@utils/util';

type WooRestClient = InstanceType<typeof WooCommerceRestApi>;

function normalizeStoreBaseUrl(url: string): string {
  return url.replace(/\/+$/, '').replace(/\/wp-json\/.*$/, '');
}

function createStoreWooClient(storeUrl: string, consumerKey: string, consumerSecret: string, port?: number | null): WooRestClient {
  return new WooCommerceRestApi({
    url: normalizeStoreBaseUrl(storeUrl),
    consumerKey,
    consumerSecret,
    version: 'wc/v3',
    queryStringAuth: true,
    ...(port != null && { port }),
  });
}

function wooClientErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const res = (err as { response?: { status?: number; data?: unknown } }).response;
    if (res && typeof res.status === 'number') {
      const raw = typeof res.data === 'string' ? res.data : JSON.stringify(res.data ?? '').slice(0, 200);
      if (typeof res.data === 'object' && res.data !== null && 'message' in res.data) {
        return `${res.status} ${String((res.data as { message: string }).message)}`;
      }
      return `${res.status} ${raw}`;
    }
  }
  return err instanceof Error ? err.message : String(err);
}

function wooResponseStatus(err: unknown): number | null {
  if (typeof err !== 'object' || err === null || !('response' in err)) return null;
  const s = (err as { response?: { status?: number } }).response?.status;
  return typeof s === 'number' ? s : null;
}

function readWooProductId(row: StoreWooProduct): number {
  const id = row.id;
  if (typeof id === 'number' && Number.isFinite(id)) return id;
  if (typeof id === 'string') {
    const n = Number(id);
    if (Number.isFinite(n)) return n;
  }
  throw new HttpException(502, 'WooCommerce product missing numeric id');
}

function readWooMetaUInt(meta: unknown, key: string): number | null {
  if (!Array.isArray(meta)) return null;
  for (const m of meta) {
    if (m && typeof m === 'object' && 'key' in m && String((m as { key: string }).key) === key) {
      const v = (m as { value?: unknown }).value;
      const n = typeof v === 'number' ? v : Number(String(v));
      if (Number.isFinite(n) && n > 0) return Math.floor(n);
    }
  }
  return null;
}

class StoreService {
  public stores = StoreModel;
  private envToStoreService = new EnvToStoreService();
  private supplierService = new SupplierService();
  private categoryRulesService = new CategoryRulesService();
  public async findAllStores(userId: number): Promise<StoreSummary[]> {
    const rows = await this.stores.findAll({ where: { userId } });
    const stores = rows.map(r => r.get({ plain: true }) as Store);
    if (stores.length === 0) {
      return [];
    }

    const storeIds = stores.map(s => s.id);

    type ProductAgg = {
      storeId: number;
      productCount: string | number;
      lastProductAt: Date | string | null;
    };
    type CategoryAgg = {
      storeId: number;
      categoryCount: string | number;
      lastCategoryAt: Date | string | null;
    };

    const productAgg = (await StoreCatalogModel.findAll({
      attributes: [
        'storeId',
        [fn('COUNT', col('id')), 'productCount'],
        [fn('MAX', col('updatedAt')), 'lastProductAt'],
      ],
      where: { storeId: { [Op.in]: storeIds } },
      group: ['storeId'],
      raw: true,
    })) as unknown as ProductAgg[];

    const categoryAgg = (await StoreCategoryModel.findAll({
      attributes: [
        'storeId',
        [fn('COUNT', col('id')), 'categoryCount'],
        [fn('MAX', col('updatedAt')), 'lastCategoryAt'],
      ],
      where: { storeId: { [Op.in]: storeIds } },
      group: ['storeId'],
      raw: true,
    })) as unknown as CategoryAgg[];

    const productMap = new Map<number, ProductAgg>();
    for (const row of productAgg) {
      productMap.set(Number(row.storeId), row);
    }
    const categoryMap = new Map<number, CategoryAgg>();
    for (const row of categoryAgg) {
      categoryMap.set(Number(row.storeId), row);
    }

    return stores.map(s => {
      const p = productMap.get(s.id);
      const c = categoryMap.get(s.id);
      const productCount = p ? Number(p.productCount) : 0;
      const categoryCount = c ? Number(c.categoryCount) : 0;

      const tp = p?.lastProductAt != null ? new Date(p.lastProductAt as string | Date) : null;
      const tc = c?.lastCategoryAt != null ? new Date(c.lastCategoryAt as string | Date) : null;
      let lastSyncedAt: string | null = null;
      if (tp && tc) {
        lastSyncedAt = (tp > tc ? tp : tc).toISOString();
      } else if (tp) {
        lastSyncedAt = tp.toISOString();
      } else if (tc) {
        lastSyncedAt = tc.toISOString();
      }

      return {
        id: s.id,
        userId: s.userId,
        name: s.name,
        url: s.url,
        port: s.port,
        productCount,
        categoryCount,
        lastSyncedAt,
      };
    });
  }

  /** From `store_categories` (run `POST /stores/:id/categories/sync` to refresh from Woo). */
  public async getStoreCategories(storeId: string, userId: number): Promise<StoreProductCategory[]> {
    await this.findStoreById(storeId, userId);
    const id = Number(storeId);
    if (Number.isNaN(id)) throw new HttpException(400, 'StoreId is invalid');

    const rows = await StoreCategoryModel.findAll({
      where: { storeId: id },
      order: [['wooCategoryId', 'ASC']],
    });

    return rows.map(r => {
      const plain = r.get({ plain: true });
      if (plain.payload && typeof plain.payload === 'object' && !Array.isArray(plain.payload)) {
        const base = { ...(plain.payload as Record<string, unknown>) };
        base.id = plain.wooCategoryId;
        return base as unknown as StoreProductCategory;
      }
      return {
        id: plain.wooCategoryId,
        name: plain.name,
        slug: plain.slug,
        parent: plain.parent ?? 0,
        ...(plain.count != null ? { count: plain.count } : {}),
      } as StoreProductCategory;
    });
  }

  public async syncStoreCategories(
    storeId: string,
    userId: number,
  ): Promise<{ fetched: number; upserted: number; removed: number }> {
    await this.findStoreById(storeId, userId);
    const id = Number(storeId);
    if (Number.isNaN(id)) throw new HttpException(400, 'StoreId is invalid');

    const categories = await this.fetchAllStoreWooCategoriesLive(storeId, userId);
    if (categories.length === 0) {
      const removed = await StoreCategoryModel.destroy({ where: { storeId: id } });
      return { fetched: 0, upserted: 0, removed };
    }

    const fetchedWooCategoryIds: number[] = [];
    let upserted = 0;
    for (const row of categories) {
      const wooCategoryId = typeof row.id === 'number' ? row.id : Number(row.id);
      if (!Number.isFinite(wooCategoryId)) continue;
      fetchedWooCategoryIds.push(wooCategoryId);
      const parentRaw = row.parent;
      const parent =
        typeof parentRaw === 'number'
          ? parentRaw
          : parentRaw != null && String(parentRaw).length > 0
            ? Number(parentRaw)
            : null;
      const count = row.count != null && typeof row.count === 'number' ? row.count : null;

      await StoreCategoryModel.upsert({
        storeId: id,
        wooCategoryId,
        parent: Number.isFinite(parent as number) ? (parent as number) : null,
        name: typeof row.name === 'string' ? row.name : String(row.name ?? ''),
        slug: typeof row.slug === 'string' ? row.slug : String(row.slug ?? ''),
        count,
        payload: row as object,
      });
      upserted += 1;
    }

    const removed =
      fetchedWooCategoryIds.length === 0
        ? await StoreCategoryModel.destroy({ where: { storeId: id } })
        : await StoreCategoryModel.destroy({
            where: {
              storeId: id,
              wooCategoryId: { [Op.notIn]: fetchedWooCategoryIds },
            },
          });

    return { fetched: categories.length, upserted, removed };
  }

  /**
   * For each category in `store_categories` for this store, permanently delete it from Woo REST API (`force: true`).
   * Does not touch the local DB — run `POST /stores/:id/categories/sync` afterwards to clean up.
   * Woo 404 is treated as already gone and counted as deleted.
   */
  public async clearWooStoreCategories(
    storeId: string,
    userId: number,
  ): Promise<{ attempted: number; deleted: number; failed: { wooCategoryId: number; reason: string }[] }> {
    const store = await this.findStoreById(storeId, userId);
    const id = Number(storeId);
    if (Number.isNaN(id)) throw new HttpException(400, 'StoreId is invalid');

    const env = await this.envToStoreService.findEnvToStoreByStoreId(storeId, userId);
    const woo = createStoreWooClient(store.url, env.consumerKey, env.consumerSecret, store.port);

    const rows = await StoreCategoryModel.findAll({
      where: { storeId: id },
      order: [['wooCategoryId', 'ASC']],
    });

    const failed: { wooCategoryId: number; reason: string }[] = [];
    let deleted = 0;

    for (const row of rows) {
      const { wooCategoryId } = row.get({ plain: true });
      try {
        await woo.delete(`products/categories/${wooCategoryId}`, { force: true });
        deleted += 1;
      } catch (err) {
        const st = wooResponseStatus(err);
        if (st === 404) {
          deleted += 1;
        } else {
          failed.push({ wooCategoryId, reason: wooClientErrorMessage(err) });
        }
      }
    }

    return { attempted: rows.length, deleted, failed };
  }

  /**
   * For each row in `store_catalog` for this store, permanently delete the Woo product (`force: true`),
   * then remove the catalog row. Woo 404 is treated as already gone and the DB row is still removed.
   */
  public async clearWooProductsFromDbCatalog(
    storeId: string,
    userId: number,
  ): Promise<{
    attempted: number;
    removedFromCatalog: number;
    failed: { wooProductId: number; reason: string }[];
  }> {
    const store = await this.findStoreById(storeId, userId);
    const id = Number(storeId);
    if (Number.isNaN(id)) throw new HttpException(400, 'StoreId is invalid');

    const env = await this.envToStoreService.findEnvToStoreByStoreId(storeId, userId);
    const woo = createStoreWooClient(store.url, env.consumerKey, env.consumerSecret, store.port);

    const rows = await StoreCatalogModel.findAll({
      where: { storeId: id },
      order: [['wooProductId', 'ASC']],
    });

    const failed: { wooProductId: number; reason: string }[] = [];
    let removedFromCatalog = 0;

    for (const row of rows) {
      const plain = row.get({ plain: true });
      const wooProductId = plain.wooProductId;
      try {
        await woo.delete(`products/${wooProductId}`, { force: true });
      } catch (err) {
        const st = wooResponseStatus(err);
        if (st !== 404) {
          failed.push({ wooProductId, reason: wooClientErrorMessage(err) });
          continue;
        }
      }
      await row.destroy();
      removedFromCatalog += 1;
    }

    return { attempted: rows.length, removedFromCatalog, failed };
  }

  /** Products from `store_catalog` (run `POST /stores/:id/catalog/sync` to refresh from Woo). */
  public async getAllStoreProducts(storeId: string, userId: number): Promise<StoreWooProduct[]> {
    await this.findStoreById(storeId, userId);
    const id = Number(storeId);
    if (Number.isNaN(id)) throw new HttpException(400, 'StoreId is invalid');

    const rows = await StoreCatalogModel.findAll({
      where: { storeId: id },
      order: [['wooProductId', 'ASC']],
    });

    return rows.map(r => {
      const plain = r.get({ plain: true });
      const base =
        plain.payload && typeof plain.payload === 'object' && !Array.isArray(plain.payload)
          ? { ...(plain.payload as Record<string, unknown>) }
          : {};
      return { ...base, id: plain.wooProductId } as StoreWooProduct;
    });
  }

  /** Paginates Woo `GET /products/categories` until empty or short page. */
  private async fetchAllStoreWooCategoriesLive(storeId: string, userId: number): Promise<StoreProductCategory[]> {
    const store = await this.findStoreById(storeId, userId);
    const env = await this.envToStoreService.findEnvToStoreByStoreId(storeId, userId);
    const woo = createStoreWooClient(store.url, env.consumerKey, env.consumerSecret, store.port);

    const all: StoreProductCategory[] = [];
    const perPage = 100;
    let page = 1;
    try {
      while (true) {
        const res = await woo.get('products/categories', { page, per_page: perPage });
        const rows = res.data as unknown;
        if (!Array.isArray(rows)) {
          throw new HttpException(502, 'WooCommerce returned unexpected categories payload');
        }
        if (rows.length === 0) break;
        all.push(...(rows as StoreProductCategory[]));
        if (rows.length < perPage) break;
        page += 1;
      }
      return all;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(502, `WooCommerce categories failed: ${wooClientErrorMessage(err)}`);
    }
  }

  /** Paginates Woo `GET /products` until empty or short page. */
  private async fetchAllStoreWooProductsLive(storeId: string, userId: number): Promise<StoreWooProduct[]> {
    const store = await this.findStoreById(storeId, userId);
    const env = await this.envToStoreService.findEnvToStoreByStoreId(storeId, userId);
    const woo = createStoreWooClient(store.url, env.consumerKey, env.consumerSecret, store.port);

    const all: StoreWooProduct[] = [];
    const perPage = 100;
    let page = 1;
    try {
      while (true) {
        const res = await woo.get('products', { page, per_page: perPage });
        const rows = res.data as unknown;
        if (!Array.isArray(rows)) {
          throw new HttpException(502, 'WooCommerce returned unexpected products payload');
        }
        if (rows.length === 0) break;
        all.push(...(rows as StoreWooProduct[]));
        if (rows.length < perPage) break;
        page += 1;
      }
      return all;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(502, `WooCommerce products failed: ${wooClientErrorMessage(err)}`);
    }
  }

  public async syncStoreCatalog(
    storeId: string,
    userId: number,
  ): Promise<{ fetched: number; upserted: number; removed: number }> {
    await this.findStoreById(storeId, userId);
    const id = Number(storeId);
    if (Number.isNaN(id)) throw new HttpException(400, 'StoreId is invalid');

    const products = await this.fetchAllStoreWooProductsLive(storeId, userId);
    if (products.length === 0) {
      const removed = await StoreCatalogModel.destroy({ where: { storeId: id } });
      return { fetched: 0, upserted: 0, removed };
    }

    const validSupplierIds = new Set(
      (await SupplierModel.findAll({ attributes: ['id'], where: { userId } })).map(s => s.id),
    );

    const fetchedWooIds: number[] = [];
    let upserted = 0;
    for (const row of products) {
      const wooProductId = readWooProductId(row);
      fetchedWooIds.push(wooProductId);
      const skuRaw = row.sku != null ? String(row.sku).trim() : '';
      const sku = skuRaw.length > 0 ? skuRaw : `woo-${wooProductId}`;
      const name = typeof row.name === 'string' ? row.name : null;
      const sourceProductId = readWooMetaUInt(row.meta_data, '_source_store_product_id');
      const metaSupplierId = readWooMetaUInt(row.meta_data, '_source_supplier_id');
      const sourceSupplierId =
        metaSupplierId != null && validSupplierIds.has(metaSupplierId) ? metaSupplierId : null;

      const rawCategories = row.categories;
      const categories = Array.isArray(rawCategories)
        ? (rawCategories as { id: number }[]).map(c => String(c.id))
        : null;

      await StoreCatalogModel.upsert({
        storeId: id,
        wooProductId,
        sku,
        name,
        sourceSupplierId,
        sourceProductId,
        payload: row as object,
        categories,
      });
      upserted += 1;
    }

    const removed = await StoreCatalogModel.destroy({
      where: {
        storeId: id,
        wooProductId: { [Op.notIn]: fetchedWooIds },
      },
    });

    return { fetched: products.length, upserted, removed };
  }

  public async findStoreById(storeId: string, userId: number): Promise<Store> {
    if (isEmpty(storeId)) throw new HttpException(400, 'StoreId is empty');

    const id = Number(storeId);
    if (Number.isNaN(id)) throw new HttpException(400, 'StoreId is invalid');

    const store = await this.stores.findOne({ where: { id, userId } });
    if (!store) throw new HttpException(409, "Store doesn't exist");

    return store.get({ plain: true });
  }

  public async createStore(storeData: CreateStoreDto, userId: number): Promise<Store> {
    if (isEmpty(storeData)) throw new HttpException(400, 'storeData is empty');

    const created = await this.stores.create({ ...storeData, userId });
    return created.get({ plain: true });
  }

  public async updateStore(storeId: string, storeData: CreateStoreDto, userId: number): Promise<Store> {
    if (isEmpty(storeData)) throw new HttpException(400, 'storeData is empty');

    const id = Number(storeId);
    if (Number.isNaN(id)) throw new HttpException(400, 'StoreId is invalid');

    const store = await this.stores.findOne({ where: { id, userId } });
    if (!store) throw new HttpException(409, "Store doesn't exist");

    await store.update({
      ...(storeData.name !== undefined && { name: storeData.name }),
      ...(storeData.url !== undefined && { url: storeData.url }),
      ...(storeData.port !== undefined && { port: storeData.port ?? null }),
    });

    await store.reload();
    return store.get({ plain: true });
  }

  public async deleteStore(storeId: string, userId: number): Promise<Store> {
    const id = Number(storeId);
    if (Number.isNaN(id)) throw new HttpException(400, 'StoreId is invalid');

    const store = await this.stores.findOne({ where: { id, userId } });
    if (!store) throw new HttpException(409, "Store doesn't exist");

    const plain = store.get({ plain: true });
    await store.destroy();
    return plain;
  }

  public async importProductsFromStoreApi(
    storeId: string,
    userId: number,
    dto: ImportStoreProductsDto,
  ): Promise<StoreApiImportResult> {
    const store = await this.findStoreById(storeId, userId);
    let supplierId = dto.supplierId;
    let categoryOpts: ImportPageCategoryOptions | undefined;

    if (dto.categoryRuleId != null) {
      const rule = await this.categoryRulesService.findById(String(dto.categoryRuleId), userId);
      const sid = Number(storeId);
      if (Number.isNaN(sid) || rule.storeId !== sid) {
        throw new HttpException(400, 'Category rule does not apply to this store');
      }
      if (!rule.enabled) {
        throw new HttpException(400, 'Category rule is disabled');
      }
      if (dto.supplierId != null && dto.supplierId !== rule.supplierId) {
        throw new HttpException(400, 'supplierId does not match category rule');
      }
      supplierId = rule.supplierId;
      categoryOpts = {
        supplierCategoryId: rule.supplierCategoryId,
        targetStoreCategoryId: rule.storeCategoryId,
      };
    }

    if (supplierId == null) {
      throw new HttpException(400, 'supplierId is required when categoryRuleId is not set');
    }

    const supplier = await this.supplierService.findSupplierById(String(supplierId), userId);
    const sourceUrl = supplier.url && String(supplier.url).trim();
    if (!sourceUrl) {
      throw new HttpException(400, "Supplier has no url; set the supplier catalog base URL");
    }
    const env = await this.envToStoreService.findEnvToStoreByStoreId(storeId, userId);
    const sid = Number(storeId);
    if (Number.isNaN(sid)) throw new HttpException(400, 'StoreId is invalid');
    return importPage(store.url, sourceUrl, env.consumerKey, env.consumerSecret, dto, categoryOpts, {
      storeId: sid,
      supplierId,
    }, store.port);
  }

  /**
   * For each supplier that has enabled category and/or product rules for this store, import from
   * `supplier_catalog` (run `POST /suppliers/:id/catalog/sync` first) and assign Woo categories per rule.
   * If this supplier has `product_category_rules`, only those `sourceProductId` rows are imported.
   * If there are no product rules but there are `category_rules`, only rows whose Store API payload
   * `categories` include at least one rule `supplierCategoryId` are imported (same idea as live import).
   */
  public async importProductsSyncAllRules(
    storeId: string,
    userId: number,
    dto: SyncStoreRulesImportDto,
  ): Promise<StoreRulesSyncImportResult> {
    const store = await this.findStoreById(storeId, userId);
    const sid = Number(storeId);
    if (Number.isNaN(sid)) throw new HttpException(400, 'StoreId is invalid');

    const [catRows, prodRows] = await Promise.all([
      CategoryRuleModel.findAll({
        where: { userId, storeId: sid, enabled: true },
        order: [['id', 'ASC']],
      }),
      ProductCategoryRuleModel.findAll({
        where: { userId, storeId: sid, enabled: true },
        order: [['id', 'ASC']],
      }),
    ]);

    const supplierSet = new Set<number>();
    for (const r of catRows) supplierSet.add(r.supplierId);
    for (const r of prodRows) supplierSet.add(r.supplierId);

    let supplierIds = [...supplierSet];
    if (dto.supplierIds != null && dto.supplierIds.length > 0) {
      const allowed = new Set(dto.supplierIds);
      supplierIds = supplierIds.filter(id => allowed.has(id));
      if (supplierIds.length === 0) {
        throw new HttpException(400, 'No matching suppliers to sync (check supplierIds against rules)');
      }
    }

    if (supplierIds.length === 0) {
      throw new HttpException(400, 'No enabled category or product rules for this store');
    }

    const env = await this.envToStoreService.findEnvToStoreByStoreId(storeId, userId);
    const importDto: ImportStoreProductsDto = { importTags: dto.importTags ?? false };

    const bySupplier: ({ supplierId: number } & StoreApiImportResult)[] = [];

    for (const supplierId of supplierIds) {
      try {
        await this.supplierService.findSupplierById(String(supplierId), userId);
      } catch (e) {
        if (e instanceof HttpException && e.status === 409) {
          bySupplier.push({
            supplierId,
            productsSeen: 0,
            created: 0,
            updated: 0,
            failed: [{ sku: '-', reason: "Supplier doesn't exist" }],
            pagesProcessed: 0,
            endPage: 0,
            perPage: STORE_API_IMPORT_PER_PAGE,
          });
          continue;
        }
        throw e;
      }

      const categoryRulesOrdered = catRows
        .filter(r => r.supplierId === supplierId)
        .map(r => ({ supplierCategoryId: r.supplierCategoryId, storeCategoryId: r.storeCategoryId }));

      const productToStoreCategory = new Map<number, number>();
      for (const r of prodRows) {
        if (r.supplierId === supplierId) {
          productToStoreCategory.set(r.sourceProductId, r.storeCategoryId);
        }
      }

      let catalogRows = await SupplierCatalogModel.findAll({
        where: { supplierId },
        order: [['sourceProductId', 'ASC']],
      });

      if (productToStoreCategory.size > 0) {
        const allowedIds = new Set(productToStoreCategory.keys());
        catalogRows = catalogRows.filter(row => allowedIds.has(row.get('sourceProductId')));
      }

      const hadRowsBeforeCategoryRuleFilter = catalogRows.length > 0;

      if (productToStoreCategory.size === 0 && categoryRulesOrdered.length > 0) {
        const supplierCategoryIds = new Set(categoryRulesOrdered.map(r => r.supplierCategoryId));
        catalogRows = catalogRows.filter(row => {
          const plain = row.get({ plain: true }) as {
            sourceProductId: number;
            name: string | null;
            sku: string;
            payload: object | null;
          };
          const p = storeApiProductFromSupplierCatalogRow(plain);
          return (p.categories || []).some(c => supplierCategoryIds.has(c.id));
        });
      }

      if (catalogRows.length === 0) {
        let reason: string;
        if (productToStoreCategory.size > 0) {
          reason =
            'No supplier_catalog rows match product_category_rules sourceProductIds for this supplier; run POST /suppliers/:id/catalog/sync or fix rule ids';
        } else if (hadRowsBeforeCategoryRuleFilter && categoryRulesOrdered.length > 0) {
          reason =
            'No supplier_catalog rows match category_rules (payload.categories must include a rule supplierCategoryId); run POST /suppliers/:id/catalog/sync';
        } else {
          reason = 'No rows in supplier_catalog; run POST /suppliers/:id/catalog/sync for this supplier';
        }
        bySupplier.push({
          supplierId,
          productsSeen: 0,
          created: 0,
          updated: 0,
          failed: [
            {
              sku: '-',
              reason,
            },
          ],
          pagesProcessed: 0,
          endPage: 0,
          perPage: STORE_API_IMPORT_PER_PAGE,
        });
        continue;
      }

      const resolution: ImportRuleResolution = {
        productToStoreCategory,
        categoryRulesOrdered,
      };

      const products = catalogRows.map(r => {
        const plain = r.get({ plain: true });
        return storeApiProductFromSupplierCatalogRow({
          sourceProductId: plain.sourceProductId,
          name: plain.name,
          sku: plain.sku,
          payload: plain.payload,
        });
      });

      const result = await importFromSupplierCatalogWithRuleResolution(
        store.url,
        env.consumerKey,
        env.consumerSecret,
        products,
        importDto,
        resolution,
        { storeId: sid, supplierId },
        store.port,
      );
      bySupplier.push({ supplierId, ...result });
    }

    return { storeId: sid, bySupplier };
  }
}

export default StoreService;
