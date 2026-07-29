import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class SignUpAccountDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  declare name: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  declare lastname: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 20)
  declare username: string;

  @IsEmail()
  @IsNotEmpty()
  declare email: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 72)
  declare password: string;
}
