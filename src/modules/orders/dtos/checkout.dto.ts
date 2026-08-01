import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CheckoutDto {
  @IsUUID()
  declare cartId: string;

  @IsUUID()
  declare addressId: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  declare comment?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  declare deliveryComment?: string;
}
