import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  public name: string;

  @IsString()
  public url: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  public port?: number;
}
