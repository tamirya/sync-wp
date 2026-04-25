import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class CreateCategoryRuleDto {
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
  public supplierCategoryId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  public storeCategoryId: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  public enabled?: boolean;
}

export class UpdateCategoryRuleDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public supplierCategoryId?: number;

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
