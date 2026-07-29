import { IsString, Matches } from 'class-validator';

export class WithdrawBalanceDto {
  @IsString()
  @Matches(/^\d{1,16}(\.\d{1,2})?$/, {
    message: 'amount must be a positive decimal with at most 2 fraction digits',
  })
  declare amount: string;
}
