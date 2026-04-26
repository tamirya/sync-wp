import { NextFunction, Response } from 'express';
import { RequestWithUser } from '@interfaces/auth.interface';
import StoreProductsService from '@services/store-products.service';
import { CreateStoreProductDto, UpdateStoreProductDto } from '@dtos/store-products.dto';

class StoreProductsController {
  private service = new StoreProductsService();

  public createProduct = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const storeId: string = req.params.storeId;
      const dto: CreateStoreProductDto = req.body;
      const data = await this.service.createProduct(storeId, req.user.id, dto);
      res.status(201).json({ data, message: 'productCreated' });
    } catch (error) {
      next(error);
    }
  };

  public getProductById = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const { storeId, wooProductId } = req.params;
      const data = await this.service.getProductById(storeId, req.user.id, wooProductId);
      res.status(200).json({ data, message: 'findOne' });
    } catch (error) {
      next(error);
    }
  };

  public updateProduct = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const { storeId, wooProductId } = req.params;
      const dto: UpdateStoreProductDto = req.body;
      const data = await this.service.updateProduct(storeId, req.user.id, wooProductId, dto);
      res.status(200).json({ data, message: 'productUpdated' });
    } catch (error) {
      next(error);
    }
  };

  public deleteProduct = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const { storeId, wooProductId } = req.params;
      const data = await this.service.deleteProduct(storeId, req.user.id, wooProductId);
      res.status(200).json({ data, message: 'productDeleted' });
    } catch (error) {
      next(error);
    }
  };
}

export default StoreProductsController;
