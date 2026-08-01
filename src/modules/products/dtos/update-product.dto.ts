import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
} from 'class-validator';
import { ProductStatus } from '../../../generated/prisma/enums';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(2, 200)
  declare name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  declare description?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  declare brand?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  declare images?: string[];

  @IsOptional()
  @IsObject()
  declare attributes?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(ProductStatus)
  declare status?: ProductStatus;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  declare categoryIds?: string[];
}
