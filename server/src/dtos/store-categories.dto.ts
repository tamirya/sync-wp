import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateStoreCategoryDto {
  @IsString()
  public name: string;

  @IsOptional()
  @IsString()
  public slug?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  public parent?: number;

  @IsOptional()
  @IsString()
  public description?: string;

  @IsOptional()
  @IsString()
  public display?: string;
}

export class UpdateStoreCategoryDto {
  @IsOptional()
  @IsString()
  public name?: string;

  @IsOptional()
  @IsString()
  public slug?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  public parent?: number;

  @IsOptional()
  @IsString()
  public description?: string;

  @IsOptional()
  @IsString()
  public display?: string;
}
