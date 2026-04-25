import { Type } from 'class-transformer';
import { IsInt, IsString, Min } from 'class-validator';

export class CreateEnvToStoreDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public storeId: number;

  @IsString()
  public consumerKey: string;

  @IsString()
  public consumerSecret: string;
}
