import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

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
}
