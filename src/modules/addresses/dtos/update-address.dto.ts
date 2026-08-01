import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { AddressType } from '../../../generated/prisma/enums';

export class UpdateAddressDto {
  @IsOptional()
  @IsEnum(AddressType)
  declare type?: AddressType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  declare recipientName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(5, 20)
  declare phone?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(2, 60)
  declare country?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  declare region?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  declare city?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 150)
  declare street?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  declare building?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  declare apartment?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  declare entrance?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  declare floor?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  declare postalCode?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  declare comment?: string;

  @IsOptional()
  @IsBoolean()
  declare isDefault?: boolean;
}
