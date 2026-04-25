import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class CategoryRulesListQueryDto {
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
