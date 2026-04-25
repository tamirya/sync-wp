import { NextFunction, Response } from 'express';
import { CreateProductCategoryRuleDto, UpdateProductCategoryRuleDto } from '@dtos/product-category-rules.dto';
import { ProductCategoryRulesListQueryDto } from '@dtos/product-category-rules.query.dto';
import { RequestWithUser } from '@interfaces/auth.interface';
import { ProductCategoryRule } from '@interfaces/product-category-rules.interface';
import ProductCategoryRulesService from '@services/product-category-rules.service';

class ProductCategoryRulesController {
  public rulesService = new ProductCategoryRulesService();

  public getRules = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const q = req.query as unknown as ProductCategoryRulesListQueryDto;
      const filters: { storeId?: number; supplierId?: number } = {};
      if (q.storeId != null) filters.storeId = q.storeId;
      if (q.supplierId != null) filters.supplierId = q.supplierId;
      const data: ProductCategoryRule[] = await this.rulesService.findAll(req.user.id, filters);
      res.status(200).json({ data, message: 'findAll' });
    } catch (error) {
      next(error);
    }
  };

  public getRuleById = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const data: ProductCategoryRule = await this.rulesService.findById(req.params.id, req.user.id);
      res.status(200).json({ data, message: 'findOne' });
    } catch (error) {
      next(error);
    }
  };

  public createRule = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const body: CreateProductCategoryRuleDto = req.body;
      const data: ProductCategoryRule = await this.rulesService.create(body, req.user.id);
      res.status(201).json({ data, message: 'created' });
    } catch (error) {
      next(error);
    }
  };

  public updateRule = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const body: UpdateProductCategoryRuleDto = req.body;
      const data: ProductCategoryRule = await this.rulesService.update(req.params.id, body, req.user.id);
      res.status(200).json({ data, message: 'updated' });
    } catch (error) {
      next(error);
    }
  };

  public deleteRule = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const data: ProductCategoryRule = await this.rulesService.delete(req.params.id, req.user.id);
      res.status(200).json({ data, message: 'deleted' });
    } catch (error) {
      next(error);
    }
  };
}

export default ProductCategoryRulesController;
