import { Type } from 'class-transformer';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class AddCartItemDto {
  @IsUUID()
  declare variantId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  declare quantity: number;
}
