import nodeFetch from 'node-fetch';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { CreateSupplierDto } from '@dtos/suppliers.dto';
import { HttpException } from '@exceptions/HttpException';
import { col, fn, Op } from 'sequelize';
import { Supplier, SupplierSummary } from '@interfaces/suppliers.interface';
import SupplierModel from '@models/suppliers.model';
import SupplierCatalogModel from '@models/supplierCatalog.model';
import SupplierCategoryModel from '@models/supplierCategory.model';
import {
  fetchAllSupplierStoreApiProductCategories,
  fetchAllSupplierStoreApiProducts,
  StoreApiProduct,
  StoreApiProductCategory,
  supplierProductSkusFromStoreApi,
} from '@services/store-catalog.service';
import { isEmpty } from '@utils/util';

const SCRAPER_PATH = path.resolve(__dirname, '../scripts/woo_scraper.py');

class SupplierService {
  public suppliers = SupplierModel;

  public async findAllSuppliers(userId: number): Promise<SupplierSummary[]> {
    const rows = await this.suppliers.findAll({ where: { userId } });
    const list = rows.map(r => r.get({ plain: true }) as Supplier);
    if (list.length === 0) {
      return [];
    }

    const supplierIds = list.map(s => s.id);

    type ProductAgg = {
      supplierId: number;
      productCount: string | number;
      lastProductAt: Date | string | null;
    };
    type CategoryAgg = {
      supplierId: number;
      categoryCount: string | number;
      lastCategoryAt: Date | string | null;
    };

    const productAgg = (await SupplierCatalogModel.findAll({
      attributes: ['supplierId', [fn('COUNT', col('id')), 'productCount'], [fn('MAX', col('updatedAt')), 'lastProductAt']],
      where: { supplierId: { [Op.in]: supplierIds } },
      group: ['supplierId'],
      raw: true,
    })) as unknown as ProductAgg[];

    const categoryAgg = (await SupplierCategoryModel.findAll({
      attributes: ['supplierId', [fn('COUNT', col('id')), 'categoryCount'], [fn('MAX', col('updatedAt')), 'lastCategoryAt']],
      where: { supplierId: { [Op.in]: supplierIds } },
      group: ['supplierId'],
      raw: true,
    })) as unknown as CategoryAgg[];

    const productMap = new Map<number, ProductAgg>();
    for (const row of productAgg) {
      productMap.set(Number(row.supplierId), row);
    }
    const categoryMap = new Map<number, CategoryAgg>();
    for (const row of categoryAgg) {
      categoryMap.set(Number(row.supplierId), row);
    }

    return list.map(s => {
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
        productCount,
        categoryCount,
        lastSyncedAt,
      };
    });
  }

  /** From `supplier_categories` (run `POST /suppliers/:id/categories/sync` to refresh). */
  public async getSupplierCategories(supplierId: string, userId: number): Promise<StoreApiProductCategory[]> {
    const supplier = await this.findSupplierById(supplierId, userId);
    const rows = await SupplierCategoryModel.findAll({
      where: { supplierId: supplier.id },
      order: [['sourceCategoryId', 'ASC']],
    });

    return rows.map(r => {
      const plain = r.get({ plain: true });
      if (plain.payload && typeof plain.payload === 'object' && !Array.isArray(plain.payload)) {
        const base = { ...(plain.payload as Record<string, unknown>) };
        base.id = plain.sourceCategoryId;
        return base as StoreApiProductCategory;
      }
      return {
        id: plain.sourceCategoryId,
        name: plain.name ?? '',
        slug: plain.slug ?? '',
        description: '',
        parent: plain.parent ?? 0,
        count: 0,
        image: null,
        review_count: 0,
        permalink: '',
      } as StoreApiProductCategory;
    });
  }

  public async syncSupplierCategories(supplierId: string, userId: number): Promise<{ fetched: number; upserted: number; removed: number }> {
    const supplier = await this.findSupplierById(supplierId, userId);
    const sourceUrl = supplier.url && String(supplier.url).trim();
    if (!sourceUrl) {
      throw new HttpException(400, 'Supplier has no url; set the supplier catalog base URL');
    }

    let categories: StoreApiProductCategory[];
    try {
      categories = await fetchAllSupplierStoreApiProductCategories(sourceUrl);
    } catch (e) {
      const status = (e as HttpException).status;
      if (status === 502 || status === 403 || status === 401) {
        const result = await this.syncSupplierViaScraper(supplierId, userId, true);
        return result.categories;
      }
      throw e;
    }

    const sid = supplier.id;
    if (categories.length === 0) {
      const removed = await SupplierCategoryModel.destroy({ where: { supplierId: sid } });
      return { fetched: 0, upserted: 0, removed };
    }

    const fetchedSourceCategoryIds: number[] = [];
    let upserted = 0;
    for (const c of categories) {
      fetchedSourceCategoryIds.push(c.id);
      await SupplierCategoryModel.upsert({
        supplierId: sid,
        sourceCategoryId: c.id,
        parent: c.parent,
        name: c.name ?? '',
        slug: c.slug ?? '',
        payload: c as object,
      });
      upserted += 1;
    }

    const removed = await SupplierCategoryModel.destroy({
      where: {
        supplierId: sid,
        sourceCategoryId: { [Op.notIn]: fetchedSourceCategoryIds },
      },
    });

    return { fetched: categories.length, upserted, removed };
  }

  /** Products from `supplier_catalog` (run `POST /suppliers/:id/catalog/sync` to refresh from Store API). */
  public async getSupplierProducts(supplierId: string, userId: number): Promise<StoreApiProduct[]> {
    const supplier = await this.findSupplierById(supplierId, userId);
    return this._mapCatalogRows(
      await SupplierCatalogModel.findAll({
        where: { supplierId: supplier.id },
        order: [['sourceProductId', 'ASC']],
      }),
    );
  }

  /** Single endpoint that returns supplier + categories + products with one DB auth check. */
  public async getSupplierFull(
    supplierId: string,
    userId: number,
  ): Promise<{ supplier: Supplier; categories: StoreApiProductCategory[]; products: StoreApiProduct[] }> {
    const supplier = await this.findSupplierById(supplierId, userId);
    const id = supplier.id;

    const [categoryRows, catalogRows] = await Promise.all([
      SupplierCategoryModel.findAll({ where: { supplierId: id }, order: [['sourceCategoryId', 'ASC']] }),
      SupplierCatalogModel.findAll({ where: { supplierId: id }, order: [['sourceProductId', 'ASC']] }),
    ]);

    const categories = categoryRows.map(r => {
      const plain = r.get({ plain: true });
      if (plain.payload && typeof plain.payload === 'object' && !Array.isArray(plain.payload)) {
        const base = { ...(plain.payload as Record<string, unknown>) };
        base.id = plain.sourceCategoryId;
        return base as StoreApiProductCategory;
      }
      return {
        id: plain.sourceCategoryId,
        name: plain.name ?? '',
        slug: plain.slug ?? '',
        description: '',
        parent: plain.parent ?? 0,
        count: 0,
        image: null,
        review_count: 0,
        permalink: '',
      } as StoreApiProductCategory;
    });

    return { supplier, categories, products: this._mapCatalogRows(catalogRows) };
  }

  private _mapCatalogRows(rows: InstanceType<typeof SupplierCatalogModel>[]): StoreApiProduct[] {
    return rows.map(r => {
      const plain = r.get({ plain: true });
      if (plain.payload && typeof plain.payload === 'object' && !Array.isArray(plain.payload)) {
        return plain.payload as StoreApiProduct;
      }
      return {
        id: plain.sourceProductId,
        name: plain.name ?? '',
        slug: '',
        type: 'simple',
        sku: plain.sku,
        short_description: '',
        description: '',
        on_sale: false,
        prices: { price: '0', regular_price: '0', sale_price: '0', currency_minor_unit: 0 },
        images: [],
        categories: [],
        tags: [],
        is_in_stock: true,
      } as StoreApiProduct;
    });
  }

  private async fetchLogoFromHomepage(baseUrl: string): Promise<string | null> {
    const base = baseUrl.replace(/\/+$/, '').replace(/\/wp-json\/.*$/, '');
    let html: string;
    try {
      const res = await nodeFetch(base, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) return null;
      html = await res.text();
    } catch {
      return null;
    }

    const logoMatch =
      html.match(/<img[^>]+class="[^"]*custom-logo[^"]*"[^>]+src="([^"]+)"/i) ??
      html.match(/<img[^>]+src="([^"]+)"[^>]+class="[^"]*custom-logo[^"]*"/i);

    const ogMatch =
      html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i);

    const iconMatch =
      html.match(/<link[^>]+rel="(?:shortcut )?icon"[^>]+href="([^"]+)"/i) ?? html.match(/<link[^>]+href="([^"]+)"[^>]+rel="(?:shortcut )?icon"/i);

    const rawUrl = logoMatch?.[1] ?? ogMatch?.[1] ?? iconMatch?.[1] ?? null;
    if (!rawUrl) return null;

    return rawUrl.startsWith('http') ? rawUrl : `${base}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
  }

  public async syncSupplierCatalog(supplierId: string, userId: number): Promise<{ fetched: number; upserted: number; removed: number }> {
    const supplier = await this.findSupplierById(supplierId, userId);
    const sourceUrl = supplier.url && String(supplier.url).trim();
    if (!sourceUrl) {
      throw new HttpException(400, 'Supplier has no url; set the supplier catalog base URL');
    }

    let products: StoreApiProduct[];
    try {
      products = await fetchAllSupplierStoreApiProducts(sourceUrl);
    } catch (e) {
      const status = (e as HttpException).status;
      if (status === 502 || status === 403 || status === 401) {
        const result = await this.syncSupplierViaScraper(supplierId, userId, false);
        return result.products;
      }
      throw e;
    }
    const sid = supplier.id;
    if (products.length === 0) {
      const removed = await SupplierCatalogModel.destroy({ where: { supplierId: sid } });
      return { fetched: 0, upserted: 0, removed };
    }

    const fetchedSourceProductIds: number[] = [];
    let upserted = 0;
    for (const p of products) {
      fetchedSourceProductIds.push(p.id);
      const { skuOriginal, sku } = supplierProductSkusFromStoreApi(p);
      await SupplierCatalogModel.upsert({
        supplierId: sid,
        sourceProductId: p.id,
        skuOriginal,
        sku,
        name: p.name ?? null,
        payload: p as object,
        categories: p.categories?.map(c => String(c.id)) ?? null,
      });
      upserted += 1;
    }

    const removed = await SupplierCatalogModel.destroy({
      where: {
        supplierId: sid,
        sourceProductId: { [Op.notIn]: fetchedSourceProductIds },
      },
    });

    const logoUrl = await this.fetchLogoFromHomepage(sourceUrl);
    if (logoUrl !== null) {
      await SupplierModel.update({ logoUrl }, { where: { id: sid } });
    }

    return { fetched: products.length, upserted, removed };
  }

  /** Run woo_scraper.py for the supplier URL and persist categories + products to the DB. */
  public async syncSupplierViaScraper(
    supplierId: string,
    userId: number,
    skipProducts = false,
  ): Promise<{ categories: { fetched: number; upserted: number; removed: number }; products: { fetched: number; upserted: number; removed: number } }> {
    const supplier = await this.findSupplierById(supplierId, userId);
    const sourceUrl = supplier.url && String(supplier.url).trim();
    if (!sourceUrl) {
      throw new HttpException(400, 'Supplier has no url; set the supplier catalog base URL');
    }

    const sid = supplier.id;
    const tmpDir = os.tmpdir();
    const catsOut = path.join(tmpDir, `sc_cats_${sid}_${Date.now()}.json`);
    const prodsOut = path.join(tmpDir, `sc_prods_${sid}_${Date.now()}.json`);

    const args = [SCRAPER_PATH, sourceUrl, '--categories-out', catsOut, '--products-out', prodsOut];
    if (skipProducts) args.push('--skip-products');

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('python3', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
      proc.stdout.on('data', () => { /* suppress */ });
      proc.on('close', code => {
        if (code !== 0) reject(new Error(`woo_scraper.py exited with code ${code}: ${stderr.slice(0, 500)}`));
        else resolve();
      });
      proc.on('error', reject);
    });

    // ── Categories ──────────────────────────────────────────────────────────
    type ScraperCategory = { id: number; name: string; slug: string; parent: number; count: number; permalink: string; description: string; source: string };
    let scraperCats: ScraperCategory[] = [];
    try {
      scraperCats = JSON.parse(fs.readFileSync(catsOut, 'utf-8'));
    } catch { /* file may not exist if scraper found nothing */ }
    finally { try { fs.unlinkSync(catsOut); } catch { /* ignore */ } }

    let catsUpserted = 0;
    const fetchedCatIds: number[] = [];
    for (const cat of scraperCats) {
      if (!cat.id) continue;
      // Sitemap strategy uses negative synthetic IDs — convert to positive for UNSIGNED column
      const sourceCategoryId = cat.id < 0 ? Math.abs(cat.id) : cat.id;
      fetchedCatIds.push(sourceCategoryId);
      const payload: StoreApiProductCategory = {
        id: sourceCategoryId, name: cat.name, slug: cat.slug,
        description: cat.description ?? '',
        parent: cat.parent ?? 0, count: cat.count ?? 0,
        image: null, review_count: 0, permalink: cat.permalink ?? '',
      };
      await SupplierCategoryModel.upsert({
        supplierId: sid,
        sourceCategoryId,
        parent: cat.parent ?? null,
        name: cat.name ?? '',
        slug: cat.slug ?? '',
        payload: payload as object,
      });
      catsUpserted += 1;
    }
    const catsRemoved = await SupplierCategoryModel.destroy({
      where: { supplierId: sid, ...(fetchedCatIds.length > 0 ? { sourceCategoryId: { [Op.notIn]: fetchedCatIds } } : {}) },
    });

    // ── Products ────────────────────────────────────────────────────────────
    type ScraperProduct = {
      id: number; name: string; sku: string;
      price: string; regular_price: string; sale_price: string;
      description: string; short_description: string;
      categories: number[]; image_urls: string[];
      in_stock: boolean; on_sale: boolean; source: string;
    };
    let scraperProds: ScraperProduct[] = [];
    if (!skipProducts) {
      try {
        scraperProds = JSON.parse(fs.readFileSync(prodsOut, 'utf-8'));
      } catch { /* file may not exist */ }
      finally { try { fs.unlinkSync(prodsOut); } catch { /* ignore */ } }
    }

    let prodsUpserted = 0;
    let prodsRemoved = 0;
    const fetchedProdIds: number[] = [];

    if (!skipProducts) {
      for (const prod of scraperProds) {
        if (!prod.id) continue;
        fetchedProdIds.push(prod.id);

        const storeApiProduct: StoreApiProduct = {
          id: prod.id,
          name: prod.name ?? '',
          slug: prod.sku ? prod.sku : String(prod.id),
          type: 'simple',
          sku: prod.sku ?? '',
          short_description: prod.short_description ?? '',
          description: prod.description ?? '',
          on_sale: prod.on_sale ?? false,
          prices: { price: prod.price ?? '0', regular_price: prod.regular_price ?? '0', sale_price: prod.sale_price ?? '0', currency_minor_unit: 0 },
          images: (prod.image_urls ?? []).map((src: string) => ({ src })),
          categories: (prod.categories ?? []).map((id: number) => ({ id, name: '', slug: '' })),
          tags: [],
          is_in_stock: prod.in_stock ?? true,
        };

        const { skuOriginal, sku } = supplierProductSkusFromStoreApi(storeApiProduct);
        await SupplierCatalogModel.upsert({
          supplierId: sid,
          sourceProductId: prod.id,
          skuOriginal,
          sku,
          name: prod.name ?? null,
          payload: storeApiProduct as object,
          categories: (prod.categories ?? []).map(String),
        });
        prodsUpserted += 1;
      }

      prodsRemoved = await SupplierCatalogModel.destroy({
        where: { supplierId: sid, ...(fetchedProdIds.length > 0 ? { sourceProductId: { [Op.notIn]: fetchedProdIds } } : {}) },
      });
    }

    return {
      categories: { fetched: scraperCats.length, upserted: catsUpserted, removed: catsRemoved },
      products: { fetched: scraperProds.length, upserted: prodsUpserted, removed: prodsRemoved },
    };
  }

  public async findSupplierById(supplierId: string, userId: number): Promise<Supplier> {
    if (isEmpty(supplierId)) throw new HttpException(400, 'SupplierId is empty');

    const id = Number(supplierId);
    if (Number.isNaN(id)) throw new HttpException(400, 'SupplierId is invalid');

    const supplier = await this.suppliers.findOne({ where: { id, userId } });
    if (!supplier) throw new HttpException(409, "Supplier doesn't exist");

    return supplier.get({ plain: true });
  }

  public async createSupplier(supplierData: CreateSupplierDto, userId: number): Promise<Supplier> {
    if (isEmpty(supplierData)) throw new HttpException(400, 'supplierData is empty');

    const created = await this.suppliers.create({ ...supplierData, userId });
    return created.get({ plain: true });
  }

  public async updateSupplier(supplierId: string, supplierData: CreateSupplierDto, userId: number): Promise<Supplier> {
    if (isEmpty(supplierData)) throw new HttpException(400, 'supplierData is empty');

    const id = Number(supplierId);
    if (Number.isNaN(id)) throw new HttpException(400, 'SupplierId is invalid');

    const supplier = await this.suppliers.findOne({ where: { id, userId } });
    if (!supplier) throw new HttpException(409, "Supplier doesn't exist");

    await supplier.update({
      ...(supplierData.name !== undefined && { name: supplierData.name }),
      ...(supplierData.url !== undefined && { url: supplierData.url }),
    });

    await supplier.reload();
    return supplier.get({ plain: true });
  }

  public async deleteSupplier(supplierId: string, userId: number): Promise<Supplier> {
    const id = Number(supplierId);
    if (Number.isNaN(id)) throw new HttpException(400, 'SupplierId is invalid');

    const supplier = await this.suppliers.findOne({ where: { id, userId } });
    if (!supplier) throw new HttpException(409, "Supplier doesn't exist");

    const plain = supplier.get({ plain: true });
    await supplier.destroy();
    return plain;
  }

  public async getSupplierLogo(supplierId: string, userId: number): Promise<{ logoUrl: string | null }> {
    const supplier = await this.findSupplierById(supplierId, userId);
    const sourceUrl = supplier.url && String(supplier.url).trim();
    if (!sourceUrl) return { logoUrl: null };
    const logoUrl = await this.fetchLogoFromHomepage(sourceUrl);
    return { logoUrl };
  }
}

export default SupplierService;
