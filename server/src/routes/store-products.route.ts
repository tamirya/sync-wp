import { Router } from 'express';
import StoreProductsController from '@controllers/store-products.controller';
import { CreateStoreProductDto, UpdateStoreProductDto } from '@dtos/store-products.dto';
import { Routes } from '@interfaces/routes.interface';
import authMiddleware from '@middlewares/auth.middleware';
import validationMiddleware from '@middlewares/validation.middleware';

class StoreProductsRoute implements Routes {
  public path = '/stores/:storeId/woo-products';
  public router = Router({ mergeParams: true });
  private controller = new StoreProductsController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      `${this.path}`,
      authMiddleware,
      validationMiddleware(CreateStoreProductDto, 'body'),
      this.controller.createProduct,
    );
    this.router.get(`${this.path}/:wooProductId`, authMiddleware, this.controller.getProductById);
    this.router.put(
      `${this.path}/:wooProductId`,
      authMiddleware,
      validationMiddleware(UpdateStoreProductDto, 'body', true),
      this.controller.updateProduct,
    );
    this.router.delete(`${this.path}/:wooProductId`, authMiddleware, this.controller.deleteProduct);
  }
}

export default StoreProductsRoute;
