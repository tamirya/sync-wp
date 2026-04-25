import { IsString } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  public name: string;

  @IsString()
  public url: string;
}
