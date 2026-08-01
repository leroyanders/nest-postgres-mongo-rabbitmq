import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class PayOrderDto {
  @IsUUID()
  declare orderId: string;

  @IsOptional()
  @IsString()
  @Length(8, 64)
  declare idempotencyKey?: string;
}
