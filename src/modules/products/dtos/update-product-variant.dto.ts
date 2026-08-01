import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';
import { ProductVariantStatus } from '../../../generated/prisma/enums';

const PRICE_PATTERN = /^\d{1,16}(\.\d{1,2})?$/;
const WEIGHT_PATTERN = /^\d{1,7}(\.\d{1,3})?$/;

export class UpdateProductVariantDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  declare name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  declare barcode?: string;

  @IsOptional()
  @IsString()
  @Matches(PRICE_PATTERN, {
    message: 'price must be a positive decimal with at most 2 fraction digits',
  })
  declare price?: string;

  @IsOptional()
  @IsString()
  @Matches(PRICE_PATTERN, {
    message:
      'oldPrice must be a positive decimal with at most 2 fraction digits',
  })
  declare oldPrice?: string;

  @IsOptional()
  @IsString()
  @Matches(PRICE_PATTERN, {
    message:
      'costPrice must be a positive decimal with at most 2 fraction digits',
  })
  declare costPrice?: string;

  @IsOptional()
  @IsObject()
  declare attributes?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  declare images?: string[];

  @IsOptional()
  @IsString()
  @Matches(WEIGHT_PATTERN, {
    message: 'weight must be a positive decimal with at most 3 fraction digits',
  })
  declare weight?: string;

  @IsOptional()
  @IsEnum(ProductVariantStatus)
  declare status?: ProductVariantStatus;

  @IsOptional()
  @IsBoolean()
  declare isDefault?: boolean;
}
