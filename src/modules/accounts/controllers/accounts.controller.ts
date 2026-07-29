import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/guards/jwt-auth.guard';
import type { AuthUser } from '../../../shared/auth/types/auth-user';
import { SignInAccountDto } from '../dtos/sign-in-account.dto';
import { SignUpAccountDto } from '../dtos/sign-up-account.dto';
import { AccountsService } from '../services/accounts.service';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getAccount(@CurrentUser() user: AuthUser) {
    return this.accountsService.getAccount(user.id);
  }

  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: SignUpAccountDto) {
    return this.accountsService.registerAccount(dto);
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: SignInAccountDto) {
    return this.accountsService.loginAccount(dto);
  }
}
