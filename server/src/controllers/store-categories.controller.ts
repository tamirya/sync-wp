import { NextFunction, Response } from 'express';
import { RequestWithUser } from '@interfaces/auth.interface';
import StoreCategoriesService from '@services/store-categories.service';
import { CreateStoreCategoryDto, UpdateStoreCategoryDto } from '@dtos/store-categories.dto';

class StoreCategoriesController {
  private service = new StoreCategoriesService();

  public createCategory = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.storeId;
      const dto: CreateStoreCategoryDto = req.body;
      const data = await this.service.createCategory(storeId, req.user.id, dto);
      res.status(201).json({ data, message: 'categoryCreated' });
    } catch (error) {
      next(error);
    }
  };

  public getCategoryById = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const { storeId, wooCategoryId } = req.params;
      const data = await this.service.getCategoryById(storeId, req.user.id, wooCategoryId);
      res.status(200).json({ data, message: 'findOne' });
    } catch (error) {
      next(error);
    }
  };

  public updateCategory = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const { storeId, wooCategoryId } = req.params;
      const dto: UpdateStoreCategoryDto = req.body;
      const data = await this.service.updateCategory(storeId, req.user.id, wooCategoryId, dto);
      res.status(200).json({ data, message: 'categoryUpdated' });
    } catch (error) {
      next(error);
    }
  };

  public deleteCategory = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const { storeId, wooCategoryId } = req.params;
      const data = await this.service.deleteCategory(storeId, req.user.id, wooCategoryId);
      res.status(200).json({ data, message: 'categoryDeleted' });
    } catch (error) {
      next(error);
    }
  };
}

export default StoreCategoriesController;
