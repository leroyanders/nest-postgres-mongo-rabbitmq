import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';

export class SignInAccountDto {
  @ValidateIf((dto: SignInAccountDto) => !dto.email)
  @IsString()
  @IsNotEmpty()
  @Length(2, 20)
  declare username?: string;

  @ValidateIf((dto: SignInAccountDto) => !dto.username)
  @IsEmail()
  @IsNotEmpty()
  declare email?: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 72)
  declare password: string;
}
