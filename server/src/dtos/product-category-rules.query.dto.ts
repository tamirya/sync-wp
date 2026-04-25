import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class ProductCategoryRulesListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public storeId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public supplierId?: number;
}
