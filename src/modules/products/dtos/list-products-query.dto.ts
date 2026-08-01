import { IsOptional, IsString, Length } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dtos/pagination-query.dto';

export class ListProductsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  declare storeSlug?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  declare categorySlug?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  declare search?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  declare brand?: string;
}
