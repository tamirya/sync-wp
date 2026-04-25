import { NextFunction, Response } from 'express';
import { CreateCategoryRuleDto, UpdateCategoryRuleDto } from '@dtos/category-rules.dto';
import { CategoryRulesListQueryDto } from '@dtos/category-rules.query.dto';
import { RequestWithUser } from '@interfaces/auth.interface';
import { CategoryRule } from '@interfaces/category-rules.interface';
import CategoryRulesService from '@services/category-rules.service';

class CategoryRulesController {
  public rulesService = new CategoryRulesService();

  public getRules = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const q = req.query as unknown as CategoryRulesListQueryDto;
      const filters: { storeId?: number; supplierId?: number } = {};
      if (q.storeId != null) filters.storeId = q.storeId;
      if (q.supplierId != null) filters.supplierId = q.supplierId;
      const data: CategoryRule[] = await this.rulesService.findAll(req.user.id, filters);
      res.status(200).json({ data, message: 'findAll' });
    } catch (error) {
      next(error);
    }
  };

  public getRuleById = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const data: CategoryRule = await this.rulesService.findById(req.params.id, req.user.id);
      res.status(200).json({ data, message: 'findOne' });
    } catch (error) {
      next(error);
    }
  };

  public createRule = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const body: CreateCategoryRuleDto = req.body;
      const data: CategoryRule = await this.rulesService.create(body, req.user.id);
      res.status(201).json({ data, message: 'created' });
    } catch (error) {
      next(error);
    }
  };

  public updateRule = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const body: UpdateCategoryRuleDto = req.body;
      const data: CategoryRule = await this.rulesService.update(req.params.id, body, req.user.id);
      res.status(200).json({ data, message: 'updated' });
    } catch (error) {
      next(error);
    }
  };

  public deleteRule = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const data: CategoryRule = await this.rulesService.delete(req.params.id, req.user.id);
      res.status(200).json({ data, message: 'deleted' });
    } catch (error) {
      next(error);
    }
  };
}

export default CategoryRulesController;
