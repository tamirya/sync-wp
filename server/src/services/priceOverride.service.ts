import { HttpException } from '@exceptions/HttpException';
import PriceOverrideModel, { PriceOverrideAttributes, PriceOverrideType } from '@models/priceOverride.model';
import SupplierCategoryModel from '@models/supplierCategory.model';
import SupplierModel from '@models/suppliers.model';

export type PriceOverrideResult = { markupPercent: number; useSalePrices: boolean };

/** Returns markup settings for a product, or null if no override applies. */
export type PriceOverrideResolver = (sourceProductId: number, categoryIds: number[]) => PriceOverrideResult | null;

class PriceOverrideService {
  public async upsertOverride(
    userId: number,
    supplierId: number,
    type: PriceOverrideType,
    targetId: number,
    markupPercent: number,
    useSalePrices: boolean,
  ): Promise<PriceOverrideAttributes> {
    await this.validateSupplierOwnership(supplierId, userId);

    const [row] = await PriceOverrideModel.upsert(
      { userId, supplierId, type, targetId, markupPercent, useSalePrices },
      { returning: true },
    );
    return row.get({ plain: true });
  }

  public async getOverridesForSupplier(supplierId: number, userId: number): Promise<PriceOverrideAttributes[]> {
    await this.validateSupplierOwnership(supplierId, userId);

    const rows = await PriceOverrideModel.findAll({
      where: { supplierId, userId },
      order: [['type', 'ASC'], ['targetId', 'ASC']],
    });
    return rows.map(r => r.get({ plain: true }));
  }

  /**
   * Preloads all overrides + the supplier category tree for the given supplier,
   * then returns a fast in-memory resolver function.
   *
   * Priority: product override > category override (direct then ancestors) > null
   */
  public async buildResolver(supplierId: number, userId: number): Promise<PriceOverrideResolver> {
    const [overrides, categoryRows] = await Promise.all([
      PriceOverrideModel.findAll({ where: { supplierId, userId } }),
      SupplierCategoryModel.findAll({
        where: { supplierId },
        attributes: ['sourceCategoryId', 'parent'],
      }),
    ]);

    const productOverrides = new Map<number, PriceOverrideResult>();
    const categoryOverrides = new Map<number, PriceOverrideResult>();

    for (const o of overrides) {
      const plain = o.get({ plain: true });
      const data: PriceOverrideResult = {
        markupPercent: Number(plain.markupPercent),
        useSalePrices: Boolean(plain.useSalePrices),
      };
      const targetId = Number(plain.targetId);
      if (plain.type === 'product') productOverrides.set(targetId, data);
      else categoryOverrides.set(targetId, data);
    }

    const parentMap = new Map<number, number | null>();
    for (const cat of categoryRows) {
      const plain = cat.get({ plain: true });
      parentMap.set(plain.sourceCategoryId, plain.parent ?? null);
    }

    return (sourceProductId: number, categoryIds: number[]): PriceOverrideResult | null => {
      const productId = Number(sourceProductId);
      if (productOverrides.has(productId)) {
        return productOverrides.get(productId)!;
      }

      for (const catId of categoryIds) {
        let currentId: number | null = Number(catId);
        while (currentId != null && Number.isFinite(currentId)) {
          if (categoryOverrides.has(currentId)) {
            return categoryOverrides.get(currentId)!;
          }
          currentId = parentMap.get(currentId) ?? null;
        }
      }

      return null;
    };
  }

  private async validateSupplierOwnership(supplierId: number, userId: number): Promise<void> {
    const supplier = await SupplierModel.findOne({ where: { id: supplierId, userId } });
    if (!supplier) throw new HttpException(404, 'Supplier not found');
  }
}

export default PriceOverrideService;
