import { Transform } from 'class-transformer';
import { Equals } from 'class-validator';

function toStrictConfirmTrue(value: unknown): boolean {
  if (value === true) return true;
  if (value === 1) return true;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes') return true;
  }
  return false;
}

/** Body for `POST /stores/:id/products/clear-woo` (destructive). */
export class ClearStoreWooProductsDto {
  /** Accepts boolean `true` or JSON/string `"true"`, `"1"`, `"yes"` (Postman often sends strings). */
  @Transform(({ value }) => toStrictConfirmTrue(value))
  @Equals(true, { message: 'confirm must be true to delete all products from Woo for this store' })
  public confirm!: boolean;
}
