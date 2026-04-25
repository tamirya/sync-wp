import { Router } from 'express';
import CategoryRulesController from '@controllers/category-rules.controller';
import { CreateCategoryRuleDto, UpdateCategoryRuleDto } from '@dtos/category-rules.dto';
import { CategoryRulesListQueryDto } from '@dtos/category-rules.query.dto';
import { Routes } from '@interfaces/routes.interface';
import authMiddleware from '@middlewares/auth.middleware';
import validationMiddleware from '@middlewares/validation.middleware';

class CategoryRulesRoute implements Routes {
  public path = '/category-rules';
  public router = Router();
  public controller = new CategoryRulesController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      `${this.path}`,
      authMiddleware,
      validationMiddleware(CategoryRulesListQueryDto, 'query', true),
      this.controller.getRules,
    );
    this.router.get(`${this.path}/:id`, authMiddleware, this.controller.getRuleById);
    this.router.post(
      `${this.path}`,
      authMiddleware,
      validationMiddleware(CreateCategoryRuleDto, 'body'),
      this.controller.createRule,
    );
    this.router.put(
      `${this.path}/:id`,
      authMiddleware,
      validationMiddleware(UpdateCategoryRuleDto, 'body', true),
      this.controller.updateRule,
    );
    this.router.delete(`${this.path}/:id`, authMiddleware, this.controller.deleteRule);
  }
}

export default CategoryRulesRoute;
