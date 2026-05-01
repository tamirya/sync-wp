import { NextFunction, Response } from 'express';
import { ImportStoreProductsDto } from '@dtos/import-store-products.dto';
import { SyncStoreRulesImportDto } from '@dtos/sync-store-rules-import.dto';
import { SyncSingleRuleImportDto } from '@dtos/sync-single-rule-import.dto';
import { CreateStoreDto } from '@dtos/stores.dto';
import { RequestWithUser } from '@interfaces/auth.interface';
import { Store, StoreProductCategory, StoreSummary, StoreWooProduct } from '@interfaces/stores.interface';
import { StoreApiImportResult, StoreRulesSyncImportResult } from '@services/store-catalog.service';
import storeService from '@services/stores.service';

class StoresController {
  public storeService = new storeService();

  public getStores = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const data: StoreSummary[] = await this.storeService.findAllStores(req.user.id);
      res.status(200).json({ data, message: 'findAll' });
    } catch (error) {
      next(error);
    }
  };

  public getStoreCategories = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.id;
      const data: StoreProductCategory[] = await this.storeService.getStoreCategories(storeId, req.user.id);
      res.status(200).json({ data, message: 'categories' });
    } catch (error) {
      next(error);
    }
  };

  public clearStoreCategoriesFromDb = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.id;
      const data = await this.storeService.clearWooStoreCategories(storeId, req.user.id);
      res.status(200).json({ data, message: 'storeCategoriesCleared' });
    } catch (error) {
      next(error);
    }
  };

  public clearWooProductsFromCatalog = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.id;
      const data = await this.storeService.clearWooProductsFromDbCatalog(storeId, req.user.id);
      res.status(200).json({ data, message: 'wooProductsClearedFromCatalog' });
    } catch (error) {
      next(error);
    }
  };

  public getStoreProducts = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.id;
      const data: StoreWooProduct[] = await this.storeService.getAllStoreProducts(storeId, req.user.id);
      res.status(200).json({ data, message: 'products' });
    } catch (error) {
      next(error);
    }
  };

  public getStoreById = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.id;
      const data: Store = await this.storeService.findStoreById(storeId, req.user.id);
      res.status(200).json({ data, message: 'findOne' });
    } catch (error) {
      next(error);
    }
  };

  public createStore = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeData: CreateStoreDto = req.body;
      const data: Store = await this.storeService.createStore(storeData, req.user.id);
      res.status(201).json({ data, message: 'created' });
    } catch (error) {
      next(error);
    }
  };

  public updateStore = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.id;
      const storeData: CreateStoreDto = req.body;
      const data: Store = await this.storeService.updateStore(storeId, storeData, req.user.id);
      res.status(200).json({ data, message: 'updated' });
    } catch (error) {
      next(error);
    }
  };

  public deleteStore = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.id;
      const data: Store = await this.storeService.deleteStore(storeId, req.user.id);
      res.status(200).json({ data, message: 'deleted' });
    } catch (error) {
      next(error);
    }
  };

  public importSyncSingleRule = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.id;
      const body: SyncSingleRuleImportDto = req.body;
      const data = await this.storeService.importProductsSyncSingleRule(storeId, req.user.id, body);
      res.status(200).json({ data, message: 'importSyncSingleRule' });
    } catch (error) {
      next(error);
    }
  };

  public importSyncRules = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.id;
      const body: SyncStoreRulesImportDto = req.body;
      const data: StoreRulesSyncImportResult = await this.storeService.importProductsSyncAllRules(storeId, req.user.id, body);
      res.status(200).json({ data, message: 'importSyncRules' });
    } catch (error) {
      next(error);
    }
  };

  public importFromStoreApi = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.id;
      const body: ImportStoreProductsDto = req.body;
      const data: StoreApiImportResult = await this.storeService.importProductsFromStoreApi(storeId, req.user.id, body);
      res.status(200).json({ data, message: 'importBatch' });
    } catch (error) {
      next(error);
    }
  };

  public syncStoreCategories = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.id;
      const data = await this.storeService.syncStoreCategories(storeId, req.user.id);
      res.status(200).json({ data, message: 'categoriesSynced' });
    } catch (error) {
      next(error);
    }
  };

  public syncStoreCatalog = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.id;
      const data = await this.storeService.syncStoreCatalog(storeId, req.user.id);
      res.status(200).json({ data, message: 'catalogSynced' });
    } catch (error) {
      next(error);
    }
  };
}

export default StoresController;
