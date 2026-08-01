import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../../common/dtos/pagination-query.dto';
import { Prisma } from '../../../generated/prisma/client';
import { JwtAuthGuard } from '../../../shared/auth/guards/jwt-auth.guard';
import type { AuthUser } from '../../../shared/auth/types/auth-user';
import { ProfileService } from '../../profiles/services/profile.service';
import { DepositWalletDto } from '../dtos/deposit-wallet.dto';
import { WithdrawWalletDto } from '../dtos/withdraw-wallet.dto';
import { WalletService } from '../services/wallet.service';

@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly profileService: ProfileService,
  ) {}

  @Get()
  async getWallet(@CurrentUser() user: AuthUser) {
    const profileId = await this.profileService.requireProfileId(user.id);
    return this.walletService.getWallet(profileId);
  }

  @Get('transactions')
  async listTransactions(
    @CurrentUser() user: AuthUser,
    @Query() pagination: PaginationQueryDto,
  ) {
    const profileId = await this.profileService.requireProfileId(user.id);
    return this.walletService.listTransactions(profileId, pagination);
  }

  @Post('deposit')
  @HttpCode(HttpStatus.OK)
  async deposit(@CurrentUser() user: AuthUser, @Body() dto: DepositWalletDto) {
    const profileId = await this.profileService.requireProfileId(user.id);
    return this.walletService.deposit(
      profileId,
      new Prisma.Decimal(dto.amount),
      dto.description,
    );
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  async withdraw(
    @CurrentUser() user: AuthUser,
    @Body() dto: WithdrawWalletDto,
  ) {
    const profileId = await this.profileService.requireProfileId(user.id);
    return this.walletService.withdraw(
      profileId,
      new Prisma.Decimal(dto.amount),
      dto.description,
    );
  }
}
