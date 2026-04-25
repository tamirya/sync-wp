import { NextFunction, Response } from 'express';
import { CreateSupplierDto } from '@dtos/suppliers.dto';
import { RequestWithUser } from '@interfaces/auth.interface';
import { Supplier, SupplierSummary } from '@interfaces/suppliers.interface';
import supplierService from '@services/suppliers.service';
import { StoreApiProduct, StoreApiProductCategory } from '@services/store-catalog.service';

class SuppliersController {
  public supplierService = new supplierService();

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
      const data: StoreApiProduct[] = await this.supplierService.getSupplierProducts(supplierId, req.user.id);
      res.status(200).json({ data, message: 'products' });
    } catch (error) {
      next(error);
    }
  };

  public syncSupplierCategories = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const supplierId: string = req.params.id;
      const data = await this.supplierService.syncSupplierCategories(supplierId, req.user.id);
      res.status(200).json({ data, message: 'categoriesSynced' });
    } catch (error) {
      next(error);
    }
  };

  public syncSupplierCatalog = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const supplierId: string = req.params.id;
      const data = await this.supplierService.syncSupplierCatalog(supplierId, req.user.id);
      res.status(200).json({ data, message: 'catalogSynced' });
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
