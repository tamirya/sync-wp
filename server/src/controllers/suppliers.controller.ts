import { NextFunction, Response } from 'express';
import { CreateSupplierDto } from '@dtos/suppliers.dto';
import { RequestWithUser } from '@interfaces/auth.interface';
import { Supplier, SupplierSummary } from '@interfaces/suppliers.interface';
import supplierService from '@services/suppliers.service';
import JobsService from '@services/jobs.service';
import { supplierSyncQueue } from '@/queues';
import { StoreApiProduct, StoreApiProductCategory } from '@services/store-catalog.service';

class SuppliersController {
  public supplierService = new supplierService();
  private jobsService = new JobsService();

  public getSuppliers = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const data: SupplierSummary[] = await this.supplierService.findAllSuppliers(req.user.id);
      res.status(200).json({ data, message: 'findAll' });
    } catch (error) {
      next(error);
    }
  };

  public getSupplierCategories = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const supplierId: string = req.params.id;
      const data: StoreApiProductCategory[] = await this.supplierService.getSupplierCategories(supplierId, req.user.id);
      res.status(200).json({ data, message: 'categories' });
    } catch (error) {
      next(error);
    }
  };

  public getSupplierProducts = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const supplierId: string = req.params.id;
      const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
      const page = req.query.page ? Math.max(Number(req.query.page), 1) : 1;
      const perPage = req.query.perPage ? Math.min(Number(req.query.perPage), 200) : 24;
      const data = await this.supplierService.getSupplierProducts(supplierId, req.user.id, { categoryId, page, perPage });
      res.status(200).json({ data, message: 'products' });
    } catch (error) {
      next(error);
    }
  };

  public syncSupplierCategories = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const supplierId: string = req.params.id;
      await this.supplierService.findSupplierById(supplierId, req.user.id);

      if (await this.jobsService.hasActiveJob('supplier_categories', Number(supplierId))) {
        res.status(409).json({ message: 'A sync job for this supplier is already running' });
        return;
      }

      const job = await this.jobsService.createJob('supplier_categories', Number(supplierId), req.user.id);
      await supplierSyncQueue.add('categories', { jobId: job.id, supplierId, userId: req.user.id });
      res.status(202).json({ data: { jobId: job.id }, message: 'categoriesSyncQueued' });
    } catch (error) {
      next(error);
    }
  };

  public syncSupplierCatalog = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const supplierId: string = req.params.id;
      await this.supplierService.findSupplierById(supplierId, req.user.id);

      if (await this.jobsService.hasActiveJob('supplier_catalog', Number(supplierId))) {
        res.status(409).json({ message: 'A sync job for this supplier is already running' });
        return;
      }

      const job = await this.jobsService.createJob('supplier_catalog', Number(supplierId), req.user.id);
      await supplierSyncQueue.add('catalog', { jobId: job.id, supplierId, userId: req.user.id });
      res.status(202).json({ data: { jobId: job.id }, message: 'catalogSyncQueued' });
    } catch (error) {
      next(error);
    }
  };

  public getSupplierFull = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const supplierId: string = req.params.id;
      const data = await this.supplierService.getSupplierFull(supplierId, req.user.id);
      res.status(200).json({ data, message: 'full' });
    } catch (error) {
      next(error);
    }
  };

  public getSupplierWithCategories = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const supplierId: string = req.params.id;
      const data = await this.supplierService.getSupplierWithCategories(supplierId, req.user.id);
      res.status(200).json({ data, message: 'withCategories' });
    } catch (error) {
      next(error);
    }
  };

  public getSupplierById = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const supplierId: string = req.params.id;
      const data: Supplier = await this.supplierService.findSupplierById(supplierId, req.user.id);
      res.status(200).json({ data, message: 'findOne' });
    } catch (error) {
      next(error);
    }
  };

  public syncSupplierViaScraper = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const supplierId: string = req.params.id;
      const skipProducts = req.query.skipProducts === 'true';
      await this.supplierService.findSupplierById(supplierId, req.user.id);

      if (await this.jobsService.hasActiveJob('supplier_scraper', Number(supplierId))) {
        res.status(409).json({ message: 'A scraper job for this supplier is already running' });
        return;
      }

      const job = await this.jobsService.createJob('supplier_scraper', Number(supplierId), req.user.id);
      await supplierSyncQueue.add('scraper', { jobId: job.id, supplierId, userId: req.user.id, skipProducts });
      res.status(202).json({ data: { jobId: job.id }, message: 'scraperSyncQueued' });
    } catch (error) {
      next(error);
    }
  };

  public getSupplierLogo = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const supplierId: string = req.params.id;
      const data = await this.supplierService.getSupplierLogo(supplierId, req.user.id);
      res.status(200).json({ data, message: 'supplierLogo' });
    } catch (error) {
      next(error);
    }
  };

  public createSupplier = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const supplierData: CreateSupplierDto = req.body;
      const data: Supplier = await this.supplierService.createSupplier(supplierData, req.user.id);
      res.status(201).json({ data, message: 'created' });
    } catch (error) {
      next(error);
    }
  };

  public updateSupplier = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const supplierId: string = req.params.id;
      const supplierData: CreateSupplierDto = req.body;
      const data: Supplier = await this.supplierService.updateSupplier(supplierId, supplierData, req.user.id);
      res.status(200).json({ data, message: 'updated' });
    } catch (error) {
      next(error);
    }
  };

  public deleteSupplier = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const supplierId: string = req.params.id;
      const data: Supplier = await this.supplierService.deleteSupplier(supplierId, req.user.id);
      res.status(200).json({ data, message: 'deleted' });
    } catch (error) {
      next(error);
    }
  };
}

export default SuppliersController;
