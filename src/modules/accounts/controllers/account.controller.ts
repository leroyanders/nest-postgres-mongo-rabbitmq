import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/auth/guards/jwt-auth.guard';
import type { IAuthUser } from '../../../shared/auth/types/auth-user';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { SignInAccountDto } from '../dtos/sign-in-account.dto';
import { SignUpAccountDto } from '../dtos/sign-up-account.dto';
import { AccountService } from '../services/account.service';
import { ISessionContext } from '../types/session-context';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getAccount(@CurrentUser() user: IAuthUser) {
    return this.accountService.getAccount(user.id);
  }

  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: SignUpAccountDto, @Req() request: Request) {
    return this.accountService.registerAccount(
      dto,
      this.sessionContext(request),
    );
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: SignInAccountDto, @Req() request: Request) {
    return this.accountService.loginAccount(dto, this.sessionContext(request));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto, @Req() request: Request) {
    return this.accountService.refreshTokens(
      dto.refreshToken,
      this.sessionContext(request),
    );
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.accountService.logoutAccount(dto.refreshToken);
  }

  private sessionContext(request: Request): ISessionContext {
    return {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    };
  }
}
