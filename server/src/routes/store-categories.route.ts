import { Router } from 'express';
import StoreCategoriesController from '@controllers/store-categories.controller';
import { CreateStoreCategoryDto, UpdateStoreCategoryDto } from '@dtos/store-categories.dto';
import { Routes } from '@interfaces/routes.interface';
import authMiddleware from '@middlewares/auth.middleware';
import validationMiddleware from '@middlewares/validation.middleware';

class StoreCategoriesRoute implements Routes {
  public path = '/stores/:storeId/categories';
  public router = Router({ mergeParams: true });
  private controller = new StoreCategoriesController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      `${this.path}`,
      authMiddleware,
      validationMiddleware(CreateStoreCategoryDto, 'body'),
      this.controller.createCategory,
    );
    this.router.get(`${this.path}/:wooCategoryId`, authMiddleware, this.controller.getCategoryById);
    this.router.put(
      `${this.path}/:wooCategoryId`,
      authMiddleware,
      validationMiddleware(UpdateStoreCategoryDto, 'body', true),
      this.controller.updateCategory,
    );
    this.router.delete(`${this.path}/:wooCategoryId`, authMiddleware, this.controller.deleteCategory);
  }
}

export default StoreCategoriesRoute;
