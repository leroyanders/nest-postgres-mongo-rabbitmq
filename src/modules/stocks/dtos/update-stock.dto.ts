import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateStockDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  declare minQuantity?: number;

  @IsOptional()
  @IsBoolean()
  declare isActive?: boolean;
}
