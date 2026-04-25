import { Router } from 'express';
import ProductCategoryRulesController from '@controllers/product-category-rules.controller';
import { CreateProductCategoryRuleDto, UpdateProductCategoryRuleDto } from '@dtos/product-category-rules.dto';
import { ProductCategoryRulesListQueryDto } from '@dtos/product-category-rules.query.dto';
import { Routes } from '@interfaces/routes.interface';
import authMiddleware from '@middlewares/auth.middleware';
import validationMiddleware from '@middlewares/validation.middleware';

class ProductCategoryRulesRoute implements Routes {
  public path = '/product-category-rules';
  public router = Router();
  public controller = new ProductCategoryRulesController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      `${this.path}`,
      authMiddleware,
      validationMiddleware(ProductCategoryRulesListQueryDto, 'query', true),
      this.controller.getRules,
    );
    this.router.get(`${this.path}/:id`, authMiddleware, this.controller.getRuleById);
    this.router.post(
      `${this.path}`,
      authMiddleware,
      validationMiddleware(CreateProductCategoryRuleDto, 'body'),
      this.controller.createRule,
    );
    this.router.put(
      `${this.path}/:id`,
      authMiddleware,
      validationMiddleware(UpdateProductCategoryRuleDto, 'body', true),
      this.controller.updateRule,
    );
    this.router.delete(`${this.path}/:id`, authMiddleware, this.controller.deleteRule);
  }
}

export default ProductCategoryRulesRoute;
