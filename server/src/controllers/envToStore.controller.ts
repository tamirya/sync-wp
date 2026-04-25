import { NextFunction, Response } from 'express';
import { CreateEnvToStoreDto } from '@dtos/envToStore.dto';
import { RequestWithUser } from '@interfaces/auth.interface';
import { EnvToStore } from '@interfaces/envToStore.interface';
import EnvToStoreService from '@services/envToStore.service';

class EnvToStoreController {
  public envToStoreService = new EnvToStoreService();

  public getEnvToStores = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const data: EnvToStore[] = await this.envToStoreService.findAllEnvToStores(req.user.id);
      res.status(200).json({ data, message: 'findAll' });
    } catch (error) {
      next(error);
    }
  };

  public getEnvToStoreById = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const id: string = req.params.id;
      const data: EnvToStore = await this.envToStoreService.findEnvToStoreById(id, req.user.id);
      res.status(200).json({ data, message: 'findOne' });
    } catch (error) {
      next(error);
    }
  };

  public createEnvToStore = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const body: CreateEnvToStoreDto = req.body;
      const data: EnvToStore = await this.envToStoreService.createEnvToStore(body, req.user.id);
      res.status(201).json({ data, message: 'created' });
    } catch (error) {
      next(error);
    }
  };

  public updateEnvToStore = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const id: string = req.params.id;
      const body: CreateEnvToStoreDto = req.body;
      const data: EnvToStore = await this.envToStoreService.updateEnvToStore(id, body, req.user.id);
      res.status(200).json({ data, message: 'updated' });
    } catch (error) {
      next(error);
    }
  };

  public deleteEnvToStore = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const id: string = req.params.id;
      const data: EnvToStore = await this.envToStoreService.deleteEnvToStore(id, req.user.id);
      res.status(200).json({ data, message: 'deleted' });
    } catch (error) {
      next(error);
    }
  };
}

export default EnvToStoreController;
