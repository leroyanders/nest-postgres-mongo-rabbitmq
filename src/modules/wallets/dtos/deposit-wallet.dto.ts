import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class DepositWalletDto {
  @IsString()
  @Matches(/^\d{1,16}(\.\d{1,2})?$/, {
    message: 'amount must be a positive decimal with at most 2 fraction digits',
  })
  declare amount: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  declare description?: string;
}
