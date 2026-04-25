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
      attributes: [
        'supplierId',
        [fn('COUNT', col('id')), 'productCount'],
        [fn('MAX', col('updatedAt')), 'lastProductAt'],
      ],
      where: { supplierId: { [Op.in]: supplierIds } },
      group: ['supplierId'],
      raw: true,
    })) as unknown as ProductAgg[];

    const categoryAgg = (await SupplierCategoryModel.findAll({
      attributes: [
        'supplierId',
        [fn('COUNT', col('id')), 'categoryCount'],
        [fn('MAX', col('updatedAt')), 'lastCategoryAt'],
      ],
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

  public async syncSupplierCategories(
    supplierId: string,
    userId: number,
  ): Promise<{ fetched: number; upserted: number; removed: number }> {
    const supplier = await this.findSupplierById(supplierId, userId);
    const sourceUrl = supplier.url && String(supplier.url).trim();
    if (!sourceUrl) {
      throw new HttpException(400, 'Supplier has no url; set the supplier catalog base URL');
    }

    const categories = await fetchAllSupplierStoreApiProductCategories(sourceUrl);
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
    const id = supplier.id;

    const rows = await SupplierCatalogModel.findAll({
      where: { supplierId: id },
      order: [['sourceProductId', 'ASC']],
    });

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
        prices: {
          price: '0',
          regular_price: '0',
          sale_price: '0',
          currency_minor_unit: 0,
        },
        images: [],
        categories: [],
        tags: [],
        is_in_stock: true,
      } as StoreApiProduct;
    });
  }

  public async syncSupplierCatalog(
    supplierId: string,
    userId: number,
  ): Promise<{ fetched: number; upserted: number; removed: number }> {
    const supplier = await this.findSupplierById(supplierId, userId);
    const sourceUrl = supplier.url && String(supplier.url).trim();
    if (!sourceUrl) {
      throw new HttpException(400, 'Supplier has no url; set the supplier catalog base URL');
    }

    const products = await fetchAllSupplierStoreApiProducts(sourceUrl);
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

    return { fetched: products.length, upserted, removed };
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
}

export default SupplierService;
