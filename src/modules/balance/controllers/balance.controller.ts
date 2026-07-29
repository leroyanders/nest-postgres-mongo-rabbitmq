import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Prisma } from '../../../generated/prisma/client';
import { JwtAuthGuard } from '../../../shared/auth/guards/jwt-auth.guard';
import type { AuthUser } from '../../../shared/auth/types/auth-user';
import { TransferBalanceDto } from '../dtos/transfer-balance.dto';
import { WithdrawBalanceDto } from '../dtos/withdraw-balance.dto';
import { BalanceService } from '../services/balance.service';

@Controller('balance')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('withdraw')
  withdrawBalance(
    @CurrentUser() user: AuthUser,
    @Body() dto: WithdrawBalanceDto,
  ) {
    return this.balanceService.withdraw(
      user.id,
      new Prisma.Decimal(dto.amount),
    );
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('transfer')
  transferBalance(
    @CurrentUser() user: AuthUser,
    @Body() dto: TransferBalanceDto,
  ) {
    return this.balanceService.transfer(
      user.id,
      dto.recipientUsername,
      new Prisma.Decimal(dto.amount),
    );
  }
}
