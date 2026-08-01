import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  declare take?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  declare skip?: number;
}

export const DEFAULT_PAGE_SIZE = 20;
