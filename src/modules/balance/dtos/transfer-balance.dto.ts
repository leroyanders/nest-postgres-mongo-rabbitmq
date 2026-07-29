import { IsNotEmpty, IsString, Length } from 'class-validator';
import { WithdrawBalanceDto } from './withdraw-balance.dto';

export class TransferBalanceDto extends WithdrawBalanceDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 20)
  declare recipientUsername: string;
}
