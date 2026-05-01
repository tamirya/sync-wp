import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Body for `POST /stores/:id/import/sync-rule`.
 * Exactly one of `categoryRuleId` or `productCategoryRuleId` must be provided.
 */
export class SyncSingleRuleImportDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  public categoryRuleId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  public productCategoryRuleId?: number;

  @IsOptional()
  @Type(() => Boolean)
  public importTags?: boolean;
}
