import { Router } from 'express';
import { Routes } from '@interfaces/routes.interface';
import authMiddleware from '@middlewares/auth.middleware';
import PriceOverrideController from '@controllers/priceOverride.controller';

class PriceOverrideRoute implements Routes {
  public router = Router();
  private controller = new PriceOverrideController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get('/suppliers/:supplierId/price-overrides', authMiddleware, this.controller.getOverrides);
    this.router.post('/suppliers/:supplierId/price-overrides', authMiddleware, this.controller.upsertOverride);
    this.router.delete('/suppliers/:supplierId/price-overrides', authMiddleware, this.controller.deleteOverride);
  }
}

export default PriceOverrideRoute;
