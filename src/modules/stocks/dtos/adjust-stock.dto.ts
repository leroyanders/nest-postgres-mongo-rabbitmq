import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { StockMovementType } from '../../../generated/prisma/enums';

export const MANUAL_ADJUSTMENT_TYPES = [
  StockMovementType.INCOME,
  StockMovementType.CORRECTION,
  StockMovementType.WRITE_OFF,
] as const;

export type ManualAdjustmentType = (typeof MANUAL_ADJUSTMENT_TYPES)[number];

export class AdjustStockDto {
  @IsUUID()
  declare variantId: string;

  @IsIn(MANUAL_ADJUSTMENT_TYPES)
  declare type: ManualAdjustmentType;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  declare quantity: number;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  declare reason?: string;
}
