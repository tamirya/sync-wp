import { Router } from 'express';
import StoresController from '@controllers/stores.controller';
import { ClearStoreWooProductsDto } from '@dtos/clear-store-woo-products.dto';
import { ImportStoreProductsDto } from '@dtos/import-store-products.dto';
import { SyncStoreRulesImportDto } from '@dtos/sync-store-rules-import.dto';
import { SyncSingleRuleImportDto } from '@dtos/sync-single-rule-import.dto';
import { CreateStoreDto } from '@dtos/stores.dto';
import { Routes } from '@interfaces/routes.interface';
import authMiddleware from '@middlewares/auth.middleware';
import validationMiddleware from '@middlewares/validation.middleware';

class StoresRoute implements Routes {
  public path = '/stores';
  public router = Router();
  public storesController = new StoresController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, authMiddleware, this.storesController.getStores);
    this.router.get(`${this.path}/:id/categories`, authMiddleware, this.storesController.getStoreCategories);
    this.router.post(`${this.path}/:id/categories/sync`, authMiddleware, this.storesController.syncStoreCategories);
    this.router.post(
      `${this.path}/:id/categories/clear`,
      authMiddleware,
      validationMiddleware(ClearStoreWooProductsDto, 'body'),
      this.storesController.clearStoreCategoriesFromDb,
    );
    this.router.get(`${this.path}/:id/products`, authMiddleware, this.storesController.getStoreProducts);
    this.router.post(
      `${this.path}/:id/products/clear-woo`,
      authMiddleware,
      validationMiddleware(ClearStoreWooProductsDto, 'body'),
      this.storesController.clearWooProductsFromCatalog,
    );
    this.router.post(`${this.path}/:id/catalog/sync`, authMiddleware, this.storesController.syncStoreCatalog);
    this.router.post(
      `${this.path}/:id/import/sync-rules`,
      authMiddleware,
      validationMiddleware(SyncStoreRulesImportDto, 'body', true),
      this.storesController.importSyncRules,
    );
    this.router.post(
      `${this.path}/:id/import/sync-rule`,
      authMiddleware,
      validationMiddleware(SyncSingleRuleImportDto, 'body', true),
      this.storesController.importSyncSingleRule,
    );
    this.router.post(
      `${this.path}/:id/import/store-api`,
      authMiddleware,
      validationMiddleware(ImportStoreProductsDto, 'body'),
      this.storesController.importFromStoreApi,
    );
    this.router.get(`${this.path}/:id`, authMiddleware, this.storesController.getStoreById);
    this.router.post(`${this.path}`, authMiddleware, validationMiddleware(CreateStoreDto, 'body'), this.storesController.createStore);
    this.router.put(`${this.path}/:id`, authMiddleware, validationMiddleware(CreateStoreDto, 'body', true), this.storesController.updateStore);
    this.router.delete(`${this.path}/:id`, authMiddleware, this.storesController.deleteStore);
  }
}

export default StoresRoute;
