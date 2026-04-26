import { HttpException } from '@exceptions/HttpException';
import { StoreWooProduct } from '@interfaces/stores.interface';
import StoreCatalogModel from '@models/storeCatalog.model';
import EnvToStoreService from '@services/envToStore.service';
import StoreService from '@services/stores.service';
import { createStoreWooClient, wooClientErrorMessage, wooResponseStatus } from '@utils/store-woo.client';
import { CreateStoreProductDto, UpdateStoreProductDto } from '@dtos/store-products.dto';

class StoreProductsService {
  private storeService = new StoreService();
  private envToStoreService = new EnvToStoreService();

  private async getWooClient(storeId: string, userId: number) {
    const store = await this.storeService.findStoreById(storeId, userId);
    const env = await this.envToStoreService.findEnvToStoreByStoreId(storeId, userId);
    const woo = createStoreWooClient(store.url, env.consumerKey, env.consumerSecret, store.port);
    return { store, env, woo };
  }

  private upsertCatalogRow(storeId: number, product: StoreWooProduct): Promise<[StoreCatalogModel, boolean | null]> {
    const wooProductId = Number(product.id);
    const skuRaw = product.sku != null ? String(product.sku).trim() : '';
    const sku = skuRaw.length > 0 ? skuRaw : `woo-${wooProductId}`;
    const name = typeof product.name === 'string' ? product.name : null;
    const rawCategories = product.categories;
    const categories = Array.isArray(rawCategories) ? (rawCategories as { id: number }[]).map(c => String(c.id)) : null;

    return StoreCatalogModel.upsert({
      storeId,
      wooProductId,
      sku,
      name,
      sourceSupplierId: null,
      sourceProductId: null,
      payload: product as object,
      categories,
    });
  }

  public async createProduct(storeId: string, userId: number, dto: CreateStoreProductDto): Promise<StoreWooProduct> {
    const id = Number(storeId);
    if (Number.isNaN(id)) throw new HttpException(400, 'StoreId is invalid');

    const { woo } = await this.getWooClient(storeId, userId);

    let created: StoreWooProduct;
    try {
      const res = await woo.post('products', dto);
      created = res.data as StoreWooProduct;
    } catch (err) {
      throw new HttpException(502, `WooCommerce create product failed: ${wooClientErrorMessage(err)}`);
    }

    if (Number.isFinite(Number(created.id))) {
      await this.upsertCatalogRow(id, created);
    }

    return created;
  }

  public async getProductById(storeId: string, userId: number, wooProductId: string): Promise<StoreWooProduct> {
    const id = Number(storeId);
    if (Number.isNaN(id)) throw new HttpException(400, 'StoreId is invalid');
    const wooId = Number(wooProductId);
    if (Number.isNaN(wooId)) throw new HttpException(400, 'wooProductId is invalid');

    const { woo } = await this.getWooClient(storeId, userId);

    try {
      const res = await woo.get(`products/${wooId}`);
      return res.data as StoreWooProduct;
    } catch (err) {
      const status = wooResponseStatus(err);
      if (status === 404) throw new HttpException(404, 'Product not found in WooCommerce');
      throw new HttpException(502, `WooCommerce get product failed: ${wooClientErrorMessage(err)}`);
    }
  }

  public async updateProduct(storeId: string, userId: number, wooProductId: string, dto: UpdateStoreProductDto): Promise<StoreWooProduct> {
    const id = Number(storeId);
    if (Number.isNaN(id)) throw new HttpException(400, 'StoreId is invalid');
    const wooId = Number(wooProductId);
    if (Number.isNaN(wooId)) throw new HttpException(400, 'wooProductId is invalid');

    const { woo } = await this.getWooClient(storeId, userId);

    let updated: StoreWooProduct;
    try {
      const res = await woo.put(`products/${wooId}`, dto);
      updated = res.data as StoreWooProduct;
    } catch (err) {
      const status = wooResponseStatus(err);
      if (status === 404) throw new HttpException(404, 'Product not found in WooCommerce');
      throw new HttpException(502, `WooCommerce update product failed: ${wooClientErrorMessage(err)}`);
    }

    await this.upsertCatalogRow(id, updated);

    return updated;
  }

  public async deleteProduct(
    storeId: string,
    userId: number,
    wooProductId: string,
  ): Promise<{ wooProductId: number; deleted: boolean }> {
    const id = Number(storeId);
    if (Number.isNaN(id)) throw new HttpException(400, 'StoreId is invalid');
    const wooId = Number(wooProductId);
    if (Number.isNaN(wooId)) throw new HttpException(400, 'wooProductId is invalid');

    const { woo } = await this.getWooClient(storeId, userId);

    try {
      await woo.delete(`products/${wooId}`, { force: true });
    } catch (err) {
      const status = wooResponseStatus(err);
      if (status !== 404) {
        throw new HttpException(502, `WooCommerce delete product failed: ${wooClientErrorMessage(err)}`);
      }
    }

    await StoreCatalogModel.destroy({ where: { storeId: id, wooProductId: wooId } });

    return { wooProductId: wooId, deleted: true };
  }
}

export default StoreProductsService;
