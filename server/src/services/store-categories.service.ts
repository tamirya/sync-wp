import { HttpException } from '@exceptions/HttpException';
import { StoreProductCategory } from '@interfaces/stores.interface';
import StoreCategoryModel from '@models/storeCategory.model';
import EnvToStoreService from '@services/envToStore.service';
import StoreService from '@services/stores.service';
import { createStoreWooClient, wooClientErrorMessage, wooResponseStatus } from '@utils/store-woo.client';
import { CreateStoreCategoryDto, UpdateStoreCategoryDto } from '@dtos/store-categories.dto';

class StoreCategoriesService {
  private storeService = new StoreService();
  private envToStoreService = new EnvToStoreService();

  private async getWooClient(storeId: string, userId: number) {
    const store = await this.storeService.findStoreById(storeId, userId);
    const env = await this.envToStoreService.findEnvToStoreByStoreId(storeId, userId);
    const woo = createStoreWooClient(store.url, env.consumerKey, env.consumerSecret, store.port);
    return { store, env, woo };
  }

  public async createCategory(storeId: string, userId: number, dto: CreateStoreCategoryDto): Promise<StoreProductCategory> {
    const id = Number(storeId);
    if (Number.isNaN(id)) throw new HttpException(400, 'StoreId is invalid');

    const { woo } = await this.getWooClient(storeId, userId);

    let created: StoreProductCategory;
    try {
      const res = await woo.post('products/categories', dto);
      created = res.data as StoreProductCategory;
    } catch (err) {
      throw new HttpException(502, `WooCommerce create category failed: ${wooClientErrorMessage(err)}`);
    }

    const wooCategoryId = Number(created.id);
    if (Number.isFinite(wooCategoryId)) {
      await StoreCategoryModel.upsert({
        storeId: id,
        wooCategoryId,
        parent: typeof created.parent === 'number' ? created.parent : null,
        name: typeof created.name === 'string' ? created.name : String(created.name ?? ''),
        slug: typeof created.slug === 'string' ? created.slug : String((created as Record<string, unknown>).slug ?? ''),
        count: typeof (created as Record<string, unknown>).count === 'number' ? (created as Record<string, unknown>).count as number : null,
        payload: created as object,
      });
    }

    return created;
  }

  public async getCategoryById(storeId: string, userId: number, wooCategoryId: string): Promise<StoreProductCategory> {
    const id = Number(storeId);
    if (Number.isNaN(id)) throw new HttpException(400, 'StoreId is invalid');
    const wooId = Number(wooCategoryId);
    if (Number.isNaN(wooId)) throw new HttpException(400, 'wooCategoryId is invalid');

    const { woo } = await this.getWooClient(storeId, userId);

    try {
      const res = await woo.get(`products/categories/${wooId}`);
      return res.data as StoreProductCategory;
    } catch (err) {
      const status = wooResponseStatus(err);
      if (status === 404) throw new HttpException(404, 'Category not found in WooCommerce');
      throw new HttpException(502, `WooCommerce get category failed: ${wooClientErrorMessage(err)}`);
    }
  }

  public async updateCategory(
    storeId: string,
    userId: number,
    wooCategoryId: string,
    dto: UpdateStoreCategoryDto,
  ): Promise<StoreProductCategory> {
    const id = Number(storeId);
    if (Number.isNaN(id)) throw new HttpException(400, 'StoreId is invalid');
    const wooId = Number(wooCategoryId);
    if (Number.isNaN(wooId)) throw new HttpException(400, 'wooCategoryId is invalid');

    const { woo } = await this.getWooClient(storeId, userId);

    let updated: StoreProductCategory;
    try {
      const res = await woo.put(`products/categories/${wooId}`, dto);
      updated = res.data as StoreProductCategory;
    } catch (err) {
      const status = wooResponseStatus(err);
      if (status === 404) throw new HttpException(404, 'Category not found in WooCommerce');
      throw new HttpException(502, `WooCommerce update category failed: ${wooClientErrorMessage(err)}`);
    }

    await StoreCategoryModel.upsert({
      storeId: id,
      wooCategoryId: wooId,
      parent: typeof updated.parent === 'number' ? updated.parent : null,
      name: typeof updated.name === 'string' ? updated.name : String(updated.name ?? ''),
      slug: typeof updated.slug === 'string' ? updated.slug : String((updated as Record<string, unknown>).slug ?? ''),
      count: typeof (updated as Record<string, unknown>).count === 'number' ? (updated as Record<string, unknown>).count as number : null,
      payload: updated as object,
    });

    return updated;
  }

  public async deleteCategory(
    storeId: string,
    userId: number,
    wooCategoryId: string,
  ): Promise<{ wooCategoryId: number; deleted: boolean }> {
    const id = Number(storeId);
    if (Number.isNaN(id)) throw new HttpException(400, 'StoreId is invalid');
    const wooId = Number(wooCategoryId);
    if (Number.isNaN(wooId)) throw new HttpException(400, 'wooCategoryId is invalid');

    const { woo } = await this.getWooClient(storeId, userId);

    try {
      await woo.delete(`products/categories/${wooId}`, { force: true });
    } catch (err) {
      const status = wooResponseStatus(err);
      if (status !== 404) {
        throw new HttpException(502, `WooCommerce delete category failed: ${wooClientErrorMessage(err)}`);
      }
    }

    await StoreCategoryModel.destroy({ where: { storeId: id, wooCategoryId: wooId } });

    return { wooCategoryId: wooId, deleted: true };
  }
}

export default StoreCategoriesService;
