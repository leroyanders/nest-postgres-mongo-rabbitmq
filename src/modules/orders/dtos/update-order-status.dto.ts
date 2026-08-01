import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { OrderStatus } from '../../../generated/prisma/enums';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  declare status: OrderStatus;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  declare comment?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  declare trackingNumber?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  declare deliveryProvider?: string;
}
