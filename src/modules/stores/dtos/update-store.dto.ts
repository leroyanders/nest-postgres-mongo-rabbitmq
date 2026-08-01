import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';

export class UpdateStoreDto {
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
  declare logo?: string;

  @IsOptional()
  @IsUrl()
  declare banner?: string;

  @IsOptional()
  @IsString()
  @Length(5, 20)
  declare phone?: string;

  @IsOptional()
  @IsEmail()
  declare email?: string;
}
