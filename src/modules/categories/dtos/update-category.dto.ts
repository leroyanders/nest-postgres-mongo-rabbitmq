import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  declare name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  declare description?: string;

  @IsOptional()
  @IsUrl()
  declare image?: string;

  @IsOptional()
  @IsUUID()
  declare parentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  declare position?: number;

  @IsOptional()
  @IsBoolean()
  declare isActive?: boolean;
}
