import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { CreateProductVariantDto } from './create-product-variant.dto';

export class CreateProductDto {
  @IsUUID()
  declare storeId: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 200)
  declare name: string;

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
  @IsArray()
  @IsUUID(undefined, { each: true })
  declare categoryIds?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  declare variants: CreateProductVariantDto[];
}
