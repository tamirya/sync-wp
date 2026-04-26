import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ProductCategoryRefDto {
  @IsInt()
  @Min(1)
  public id: number;
}

export class CreateStoreProductDto {
  @IsString()
  public name: string;

  @IsOptional()
  @IsString()
  public sku?: string;

  @IsOptional()
  @IsString()
  public type?: string;

  @IsOptional()
  @IsString()
  public status?: string;

  @IsOptional()
  @IsString()
  public description?: string;

  @IsOptional()
  @IsString()
  public short_description?: string;

  @IsOptional()
  @IsString()
  public regular_price?: string;

  @IsOptional()
  @IsString()
  public sale_price?: string;

  @IsOptional()
  @IsBoolean()
  public manage_stock?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  public stock_quantity?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductCategoryRefDto)
  public categories?: ProductCategoryRefDto[];
}

export class UpdateStoreProductDto {
  @IsOptional()
  @IsString()
  public name?: string;

  @IsOptional()
  @IsString()
  public sku?: string;

  @IsOptional()
  @IsString()
  public type?: string;

  @IsOptional()
  @IsString()
  public status?: string;

  @IsOptional()
  @IsString()
  public description?: string;

  @IsOptional()
  @IsString()
  public short_description?: string;

  @IsOptional()
  @IsString()
  public regular_price?: string;

  @IsOptional()
  @IsString()
  public sale_price?: string;

  @IsOptional()
  @IsBoolean()
  public manage_stock?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  public stock_quantity?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductCategoryRefDto)
  public categories?: ProductCategoryRefDto[];
}
