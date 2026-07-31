import { Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PrismaService } from '../../../database/services/prisma.service';
import { TokenService } from '../../../shared/auth/token.service';
import { SignInAccountDto } from '../dtos/sign-in-account.dto';
import { SignUpAccountDto } from '../dtos/sign-up-account.dto';

const BCRYPT_ROUNDS = 10;

// Compared against when the account does not exist, so that sign-in latency
// does not reveal whether an email/username is registered.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('timing-attack-placeholder', 10);

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  getAccount(id: string) {
    return this.prisma.account.findUniqueOrThrow({
      select: {
        id: true,
        email: true,
        profile: {
          select: {
            id: true,
            name: true,
            lastname: true,
            username: true,
            balance: true,
          },
        },
      },
      where: { id },
    });
  }

  async registerAccount(dto: SignUpAccountDto): Promise<{ token: string }> {
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
          },
        },
      },
    });

    return { token: this.tokenService.sign(account.id) };
  }

  async loginAccount(dto: SignInAccountDto): Promise<{ token: string }> {
    const account = await this.prisma.account.findFirst({
      select: { id: true, password: true },
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

    if (!account || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return { token: this.tokenService.sign(account.id) };
  }
}
