import { Router } from 'express';
import EnvToStoreController from '@controllers/envToStore.controller';
import { CreateEnvToStoreDto } from '@dtos/envToStore.dto';
import { Routes } from '@interfaces/routes.interface';
import authMiddleware from '@middlewares/auth.middleware';
import validationMiddleware from '@middlewares/validation.middleware';

class EnvToStoreRoute implements Routes {
  public path = '/env_to_store';
  public router = Router();
  public envToStoreController = new EnvToStoreController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, authMiddleware, this.envToStoreController.getEnvToStores);
    this.router.get(`${this.path}/:id`, authMiddleware, this.envToStoreController.getEnvToStoreById);
    this.router.post(`${this.path}`, authMiddleware, validationMiddleware(CreateEnvToStoreDto, 'body'), this.envToStoreController.createEnvToStore);
    this.router.put(
      `${this.path}/:id`,
      authMiddleware,
      validationMiddleware(CreateEnvToStoreDto, 'body', true),
      this.envToStoreController.updateEnvToStore,
    );
    this.router.delete(`${this.path}/:id`, authMiddleware, this.envToStoreController.deleteEnvToStore);
  }
}

export default EnvToStoreRoute;
