import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PrismaService } from '../../../database/services/prisma.service';
import { AccountStatus } from '../../../generated/prisma/enums';
import { TokenService } from '../../../shared/auth/services/token.service';
import { SignInAccountDto } from '../dtos/sign-in-account.dto';
import { SignUpAccountDto } from '../dtos/sign-up-account.dto';
import { IAuthTokens } from '../types/auth-tokens';
import { ISessionContext } from '../types/session-context';
import { SessionService } from './session.service';

const BCRYPT_ROUNDS = 10;

// Compared against when the account does not exist, so that sign-in latency
// does not reveal whether an email/username is registered.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('timing-attack-placeholder', 10);

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
  ) {}

  getAccount(id: string) {
    return this.prisma.account.findUniqueOrThrow({
      select: {
        id: true,
        email: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        profile: {
          select: {
            id: true,
            name: true,
            lastname: true,
            username: true,
            phone: true,
            avatar: true,
          },
        },
      },
      where: { id },
    });
  }

  async registerAccount(
    dto: SignUpAccountDto,
    context: ISessionContext,
  ): Promise<IAuthTokens> {
    const account = await this.prisma.account.create({
      select: { id: true },
      data: {
        email: dto.email,
        password: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        profile: {
          create: {
            name: dto.name,
            lastname: dto.lastname,
            username: dto.username,
            wallet: { create: {} },
          },
        },
      },
    });

    return this.issueTokens(account.id, context);
  }

  async loginAccount(
    dto: SignInAccountDto,
    context: ISessionContext,
  ): Promise<IAuthTokens> {
    const account = await this.prisma.account.findFirst({
      select: { id: true, password: true, status: true },
      where: {
        OR: [
          ...(dto.email ? [{ email: dto.email }] : []),
          ...(dto.username ? [{ profile: { username: dto.username } }] : []),
        ],
      },
    });

    const passwordMatches = await bcrypt.compare(
      dto.password,
      account?.password ?? DUMMY_PASSWORD_HASH,
    );

    if (
      !account ||
      !passwordMatches ||
      account.status === AccountStatus.DELETED
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (account.status === AccountStatus.BLOCKED) {
      throw new ForbiddenException('Account is blocked');
    }

    await this.prisma.account.update({
      select: { id: true },
      where: { id: account.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueTokens(account.id, context);
  }

  async refreshTokens(
    refreshToken: string,
    context: ISessionContext,
  ): Promise<IAuthTokens> {
    const rotated = await this.sessionService.rotate(refreshToken, context);

    const account = await this.prisma.account.findUnique({
      select: { status: true },
      where: { id: rotated.accountId },
    });

    if (!account || account.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    return {
      accessToken: this.tokenService.sign(rotated.accountId),
      refreshToken: rotated.refreshToken,
    };
  }

  async logoutAccount(refreshToken: string): Promise<void> {
    await this.sessionService.revoke(refreshToken);
  }

  private async issueTokens(
    accountId: string,
    context: ISessionContext,
  ): Promise<IAuthTokens> {
    return {
      accessToken: this.tokenService.sign(accountId),
      refreshToken: await this.sessionService.issue(accountId, context),
    };
  }
}
