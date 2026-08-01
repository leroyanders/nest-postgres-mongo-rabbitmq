import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';

export class UpdateReviewDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  declare rating?: number;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  declare title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  declare comment?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  declare images?: string[];
}
