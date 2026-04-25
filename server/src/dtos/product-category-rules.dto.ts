import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class CreateProductCategoryRuleDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public storeId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public supplierId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public sourceProductId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public storeCategoryId: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  public enabled?: boolean;
}

export class UpdateProductCategoryRuleDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public sourceProductId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public storeCategoryId?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  public enabled?: boolean;
}
