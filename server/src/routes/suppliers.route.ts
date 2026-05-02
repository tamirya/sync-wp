import { Router } from 'express';
import SuppliersController from '@controllers/suppliers.controller';
import { CreateSupplierDto } from '@dtos/suppliers.dto';
import { Routes } from '@interfaces/routes.interface';
import authMiddleware from '@middlewares/auth.middleware';
import validationMiddleware from '@middlewares/validation.middleware';

class SuppliersRoute implements Routes {
  public path = '/suppliers';
  public router = Router();
  public suppliersController = new SuppliersController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, authMiddleware, this.suppliersController.getSuppliers);
    this.router.get(`${this.path}/:id/full`, authMiddleware, this.suppliersController.getSupplierFull);
    this.router.get(`${this.path}/:id/logo`, authMiddleware, this.suppliersController.getSupplierLogo);
    this.router.get(`${this.path}/:id/categories`, authMiddleware, this.suppliersController.getSupplierCategories);
    this.router.post(`${this.path}/:id/categories/sync`, authMiddleware, this.suppliersController.syncSupplierCategories);
    this.router.post(`${this.path}/:id/catalog/sync`, authMiddleware, this.suppliersController.syncSupplierCatalog);
    this.router.post(`${this.path}/:id/scraper/sync`, authMiddleware, this.suppliersController.syncSupplierViaScraper);
    this.router.get(`${this.path}/:id/products`, authMiddleware, this.suppliersController.getSupplierProducts);
    this.router.get(`${this.path}/:id`, authMiddleware, this.suppliersController.getSupplierById);
    this.router.post(`${this.path}`, authMiddleware, validationMiddleware(CreateSupplierDto, 'body'), this.suppliersController.createSupplier);
    this.router.put(
      `${this.path}/:id`,
      authMiddleware,
      validationMiddleware(CreateSupplierDto, 'body', true),
      this.suppliersController.updateSupplier,
    );
    this.router.delete(`${this.path}/:id`, authMiddleware, this.suppliersController.deleteSupplier);
  }
}

export default SuppliersRoute;
