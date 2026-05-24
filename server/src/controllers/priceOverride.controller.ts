import { NextFunction, Response } from 'express';
import { RequestWithUser } from '@interfaces/auth.interface';
import { HttpException } from '@exceptions/HttpException';
import PriceOverrideService from '@services/priceOverride.service';
import { PriceOverrideType } from '@models/priceOverride.model';

class PriceOverrideController {
  private service = new PriceOverrideService();

  public getOverrides = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const supplierId = Number(req.params.supplierId);
      if (!Number.isFinite(supplierId)) throw new HttpException(400, 'Invalid supplierId');

      const data = await this.service.getOverridesForSupplier(supplierId, req.user.id);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  };

  public upsertOverride = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const supplierId = Number(req.params.supplierId);
      if (!Number.isFinite(supplierId)) throw new HttpException(400, 'Invalid supplierId');

      const { type, targetId, markupPercent, useSalePrices } = req.body as {
        type: PriceOverrideType;
        targetId: number;
        markupPercent: number;
        useSalePrices?: boolean;
      };

      if (type !== 'product' && type !== 'category') {
        throw new HttpException(400, 'type must be "product" or "category"');
      }
      if (!Number.isFinite(Number(targetId)) || Number(targetId) <= 0) {
        throw new HttpException(400, 'targetId must be a positive integer');
      }
      const markup = Number(markupPercent);
      if (!Number.isFinite(markup) || markup < 0 || markup > 1000) {
        throw new HttpException(400, 'markupPercent must be a number between 0 and 1000');
      }

      const data = await this.service.upsertOverride(
        req.user.id,
        supplierId,
        type,
        Number(targetId),
        markup,
        useSalePrices === true,
      );
      res.status(200).json({ data, message: 'priceOverrideUpserted' });
    } catch (error) {
      next(error);
    }
  };
}

export default PriceOverrideController;
