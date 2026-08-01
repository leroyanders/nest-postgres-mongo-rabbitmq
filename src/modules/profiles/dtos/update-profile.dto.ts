import {
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  declare name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  declare lastname?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(2, 20)
  declare username?: string;

  @IsOptional()
  @IsPhoneNumber()
  declare phone?: string;

  @IsOptional()
  @IsUrl()
  declare avatar?: string;
}
