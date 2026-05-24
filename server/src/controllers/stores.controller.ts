import { NextFunction, Response } from 'express';
import { ImportStoreProductsDto } from '@dtos/import-store-products.dto';
import { SyncStoreRulesImportDto } from '@dtos/sync-store-rules-import.dto';
import { SyncSingleRuleImportDto } from '@dtos/sync-single-rule-import.dto';
import { CreateStoreDto } from '@dtos/stores.dto';
import { RequestWithUser } from '@interfaces/auth.interface';
import { Store, StoreProductCategory, StoreSummary, StoreWooProduct } from '@interfaces/stores.interface';
import { StoreRulesSyncImportResult } from '@services/store-catalog.service';
import storeService from '@services/stores.service';
import JobsService from '@services/jobs.service';
import { storeSyncQueue } from '@/queues';

class StoresController {
  public storeService = new storeService();
  private jobsService = new JobsService();

  public getStores = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const data: StoreSummary[] = await this.storeService.findAllStores(req.user.id);
      res.status(200).json({ data, message: 'findAll' });
    } catch (error) {
      next(error);
    }
  };

  public createStoreCategory = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.id;
      const data = await this.storeService.createStoreCategory(storeId, req.user.id, req.body);
      res.status(201).json({ data, message: 'categoryCreated' });
    } catch (error) {
      next(error);
    }
  };

  public updateStoreCategory = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.id;
      const catId: string = req.params.catId;
      const data = await this.storeService.updateStoreCategory(storeId, catId, req.user.id, req.body);
      res.status(200).json({ data, message: 'categoryUpdated' });
    } catch (error) {
      next(error);
    }
  };

  public deleteStoreCategory = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.id;
      const catId: string = req.params.catId;
      const data = await this.storeService.deleteStoreCategory(storeId, catId, req.user.id);
      res.status(200).json({ data, message: 'categoryDeleted' });
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

  public getStoreLogo = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.id;
      const data = await this.storeService.getStoreLogo(storeId, req.user.id);
      res.status(200).json({ data, message: 'storeLogo' });
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
      await this.storeService.findStoreById(storeId, req.user.id);

      if (await this.jobsService.hasActiveJob('store_import_single_rule', Number(storeId))) {
        res.status(409).json({ message: 'An import job for this store is already running' });
        return;
      }

      const job = await this.jobsService.createJob('store_import_single_rule', Number(storeId), req.user.id);
      await storeSyncQueue.add('import_single_rule', { jobId: job.id, storeId, userId: req.user.id, syncSingleRuleDto: body });
      res.status(202).json({ data: { jobId: job.id }, message: 'importSyncSingleRuleQueued' });
    } catch (error) {
      next(error);
    }
  };

  public importSyncRules = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.id;
      const body: SyncStoreRulesImportDto = req.body;
      await this.storeService.findStoreById(storeId, req.user.id);

      if (await this.jobsService.hasActiveJob('store_import_rules', Number(storeId))) {
        res.status(409).json({ message: 'An import job for this store is already running' });
        return;
      }

      const job = await this.jobsService.createJob('store_import_rules', Number(storeId), req.user.id);
      await storeSyncQueue.add('import_rules', { jobId: job.id, storeId, userId: req.user.id, syncRulesDto: body });
      res.status(202).json({ data: { jobId: job.id }, message: 'importSyncRulesQueued' });
    } catch (error) {
      next(error);
    }
  };

  public importFromStoreApi = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.id;
      const body: ImportStoreProductsDto = req.body;
      await this.storeService.findStoreById(storeId, req.user.id);

      if (await this.jobsService.hasActiveJob('store_import_store_api', Number(storeId))) {
        res.status(409).json({ message: 'An import job for this store is already running' });
        return;
      }

      const job = await this.jobsService.createJob('store_import_store_api', Number(storeId), req.user.id);
      await storeSyncQueue.add('import_store_api', { jobId: job.id, storeId, userId: req.user.id, importStoreApiDto: body });
      res.status(202).json({ data: { jobId: job.id }, message: 'importBatchQueued' });
    } catch (error) {
      next(error);
    }
  };

  public syncStoreCategories = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.id;
      await this.storeService.findStoreById(storeId, req.user.id);

      if (await this.jobsService.hasActiveJob('store_categories', Number(storeId))) {
        res.status(409).json({ message: 'A sync job for this store is already running' });
        return;
      }

      const job = await this.jobsService.createJob('store_categories', Number(storeId), req.user.id);
      await storeSyncQueue.add('categories', { jobId: job.id, storeId, userId: req.user.id });
      res.status(202).json({ data: { jobId: job.id }, message: 'categoriesSyncQueued' });
    } catch (error) {
      next(error);
    }
  };

  public syncStoreCatalog = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.id;
      await this.storeService.findStoreById(storeId, req.user.id);

      if (await this.jobsService.hasActiveJob('store_catalog', Number(storeId))) {
        res.status(409).json({ message: 'A sync job for this store is already running' });
        return;
      }

      const job = await this.jobsService.createJob('store_catalog', Number(storeId), req.user.id);
      await storeSyncQueue.add('catalog', { jobId: job.id, storeId, userId: req.user.id });
      res.status(202).json({ data: { jobId: job.id }, message: 'catalogSyncQueued' });
    } catch (error) {
      next(error);
    }
  };
}

export default StoresController;
