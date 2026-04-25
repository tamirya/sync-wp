import { CreateCategoryRuleDto, UpdateCategoryRuleDto } from '@dtos/category-rules.dto';
import { HttpException } from '@exceptions/HttpException';
import { CategoryRule } from '@interfaces/category-rules.interface';
import CategoryRuleModel from '@models/categoryRules.model';
import StoreModel from '@models/stores.model';
import SupplierModel from '@models/suppliers.model';
import { isEmpty } from '@utils/util';
import { UniqueConstraintError } from 'sequelize';

class CategoryRulesService {
  public rules = CategoryRuleModel;

  public async findAll(userId: number, filters?: { storeId?: number; supplierId?: number }): Promise<CategoryRule[]> {
    const where: Record<string, unknown> = { userId };
    if (filters?.storeId != null) where.storeId = filters.storeId;
    if (filters?.supplierId != null) where.supplierId = filters.supplierId;
    const rows = await this.rules.findAll({ where, order: [['id', 'ASC']] });
    return rows.map(r => r.get({ plain: true }));
  }

  public async findById(ruleId: string, userId: number): Promise<CategoryRule> {
    if (isEmpty(ruleId)) throw new HttpException(400, 'Rule id is empty');
    const id = Number(ruleId);
    if (Number.isNaN(id)) throw new HttpException(400, 'Rule id is invalid');
    const row = await this.rules.findOne({ where: { id, userId } });
    if (!row) throw new HttpException(409, "Category rule doesn't exist");
    return row.get({ plain: true });
  }

  public async create(dto: CreateCategoryRuleDto, userId: number): Promise<CategoryRule> {
    if (isEmpty(dto)) throw new HttpException(400, 'categoryRuleData is empty');
    const store = await StoreModel.findOne({ where: { id: dto.storeId, userId } });
    if (!store) throw new HttpException(409, "Store doesn't exist");
    const supplier = await SupplierModel.findOne({ where: { id: dto.supplierId, userId } });
    if (!supplier) throw new HttpException(409, "Supplier doesn't exist");
    try {
      const created = await this.rules.create({
        userId,
        storeId: dto.storeId,
        supplierId: dto.supplierId,
        supplierCategoryId: dto.supplierCategoryId,
        storeCategoryId: dto.storeCategoryId,
        enabled: dto.enabled ?? true,
      });
      return created.get({ plain: true });
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        throw new HttpException(409, 'A rule for this store, supplier, and supplier category already exists');
      }
      throw err;
    }
  }

  public async update(ruleId: string, dto: UpdateCategoryRuleDto, userId: number): Promise<CategoryRule> {
    if (isEmpty(dto)) throw new HttpException(400, 'categoryRuleData is empty');
    const id = Number(ruleId);
    if (Number.isNaN(id)) throw new HttpException(400, 'Rule id is invalid');
    const row = await this.rules.findOne({ where: { id, userId } });
    if (!row) throw new HttpException(409, "Category rule doesn't exist");
    try {
      await row.update({
        ...(dto.supplierCategoryId !== undefined && { supplierCategoryId: dto.supplierCategoryId }),
        ...(dto.storeCategoryId !== undefined && { storeCategoryId: dto.storeCategoryId }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
      });
      await row.reload();
      return row.get({ plain: true });
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        throw new HttpException(409, 'A rule for this store, supplier, and supplier category already exists');
      }
      throw err;
    }
  }

  public async delete(ruleId: string, userId: number): Promise<CategoryRule> {
    const id = Number(ruleId);
    if (Number.isNaN(id)) throw new HttpException(400, 'Rule id is invalid');
    const row = await this.rules.findOne({ where: { id, userId } });
    if (!row) throw new HttpException(409, "Category rule doesn't exist");
    const plain = row.get({ plain: true });
    await row.destroy();
    return plain;
  }
}

export default CategoryRulesService;
