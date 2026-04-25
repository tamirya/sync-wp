import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min, ValidateIf } from 'class-validator';

export class ImportStoreProductsDto {
  /**
   * Supplier owned by the user; `supplier.url` is the catalog base for Store API.
   * Omit when `categoryRuleId` is set (supplier comes from the rule).
   */
  @ValidateIf((o: ImportStoreProductsDto) => o.categoryRuleId == null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public supplierId?: number;

  /** When set, import only products in this supplier category and map to the rule’s store category. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public categoryRuleId?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  public importTags?: boolean;
}
