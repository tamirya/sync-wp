import { NextFunction, Response } from 'express';
import { RequestWithUser } from '@interfaces/auth.interface';
import { HttpException } from '@exceptions/HttpException';
import PriceOverrideService from '@services/priceOverride.service';
import { PriceOverrideType, PricingMode } from '@models/priceOverride.model';

const MARKUP_MIN = -100;
const MARKUP_MAX = 1000;
const FIXED_AMOUNT_MIN = -9999;
const FIXED_AMOUNT_MAX = 9999;

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

      const { type, targetId, pricingMode, markupPercent, fixedAmount, useSalePrices } = req.body as {
        type: PriceOverrideType;
        targetId: number;
        pricingMode?: PricingMode;
        markupPercent: number;
        fixedAmount?: number | null;
        useSalePrices?: boolean;
      };

      if (type !== 'product' && type !== 'category') {
        throw new HttpException(400, 'type must be "product" or "category"');
      }
      if (!Number.isFinite(Number(targetId)) || Number(targetId) <= 0) {
        throw new HttpException(400, 'targetId must be a positive integer');
      }

      const mode: PricingMode = pricingMode === 'fixed_amount' ? 'fixed_amount' : 'percent';
      const markup = Number(markupPercent);
      const fixed =
        fixedAmount === null || fixedAmount === undefined ? null : Number(fixedAmount);

      if (mode === 'percent') {
        if (!Number.isFinite(markup) || markup < MARKUP_MIN || markup > MARKUP_MAX) {
          throw new HttpException(
            400,
            `markupPercent must be a number between ${MARKUP_MIN} and ${MARKUP_MAX}`,
          );
        }
      } else if (!Number.isFinite(fixed!) || fixed! < FIXED_AMOUNT_MIN || fixed! > FIXED_AMOUNT_MAX) {
        throw new HttpException(
          400,
          `fixedAmount must be a number between ${FIXED_AMOUNT_MIN} and ${FIXED_AMOUNT_MAX}`,
        );
      }

      const data = await this.service.upsertOverride(
        req.user.id,
        supplierId,
        type,
        Number(targetId),
        mode,
        mode === 'percent' ? markup : 0,
        mode === 'fixed_amount' ? fixed : null,
        useSalePrices === true,
      );
      res.status(200).json({ data, message: 'priceOverrideUpserted' });
    } catch (error) {
      next(error);
    }
  };

  public deleteOverride = async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      const supplierId = Number(req.params.supplierId);
      if (!Number.isFinite(supplierId)) throw new HttpException(400, 'Invalid supplierId');

      const { type, targetId } = req.body as {
        type: PriceOverrideType;
        targetId: number;
      };

      if (type !== 'product' && type !== 'category') {
        throw new HttpException(400, 'type must be "product" or "category"');
      }
      if (!Number.isFinite(Number(targetId)) || Number(targetId) <= 0) {
        throw new HttpException(400, 'targetId must be a positive integer');
      }

      await this.service.deleteOverride(req.user.id, supplierId, type, Number(targetId));
      res.status(200).json({ message: 'priceOverrideDeleted' });
    } catch (error) {
      next(error);
    }
  };
}

export default PriceOverrideController;
