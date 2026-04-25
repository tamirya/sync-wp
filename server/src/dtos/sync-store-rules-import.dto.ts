import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

/**
 * Body for `POST /stores/:id/import/sync-rules`.
 * Imports from `supplier_catalog` only — refresh with `POST /suppliers/:id/catalog/sync` first.
 * Per supplier: `product_category_rules` restrict to listed `sourceProductId`s. With only `category_rules`,
 * only catalog rows whose synced `categories` include a rule’s `supplierCategoryId` are imported.
 */
export class SyncStoreRulesImportDto {
  /**
   * When set, only these suppliers are imported (must still have at least one enabled rule for the store).
   * When omitted, every supplier referenced by an enabled category or product rule for this store is synced.
   */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Type(() => Number)
  public supplierIds?: number[];

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  public importTags?: boolean;
}
