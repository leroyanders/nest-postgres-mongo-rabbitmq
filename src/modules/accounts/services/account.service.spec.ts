import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PrismaService } from '../../../database/services/prisma.service';
import { AccountStatus } from '../../../generated/prisma/enums';
import { TokenService } from '../../../shared/auth/services/token.service';
import { SignUpAccountDto } from '../dtos/sign-up-account.dto';
import { AccountService } from './account.service';
import { SessionService } from './session.service';

const SESSION_CONTEXT = { userAgent: 'jest', ipAddress: '127.0.0.1' };

describe('AccountsService', () => {
  let prisma: {
    account: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
  };
  let tokenService: { sign: jest.Mock };
  let sessionService: {
    issue: jest.Mock;
    rotate: jest.Mock;
    revoke: jest.Mock;
  };
  let service: AccountService;

  beforeEach(() => {
    prisma = {
      account: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'account-1' }),
      },
    };
    tokenService = { sign: jest.fn().mockReturnValue('signed-token') };
    sessionService = {
      issue: jest.fn().mockResolvedValue('refresh-token'),
      rotate: jest.fn(),
      revoke: jest.fn().mockResolvedValue(undefined),
    };
    service = new AccountService(
      prisma as unknown as PrismaService,
      tokenService as unknown as TokenService,
      sessionService as unknown as SessionService,
    );
  });

  describe('registerAccount', () => {
    const dto: SignUpAccountDto = {
      name: 'John',
      lastname: 'Doe',
      username: 'johndoe',
      email: 'john@example.com',
      password: 'super-secret',
    };

    it('stores a bcrypt hash instead of the plaintext password', async () => {
      prisma.account.create.mockResolvedValue({ id: 'account-1' });

      await service.registerAccount(dto, SESSION_CONTEXT);

      const [[createArgs]] = prisma.account.create.mock.calls as [
        [{ data: { password: string } }],
      ];
      expect(createArgs.data.password).not.toBe(dto.password);
      await expect(
        bcrypt.compare(dto.password, createArgs.data.password),
      ).resolves.toBe(true);
    });

    it('creates the profile with a wallet together with the account', async () => {
      prisma.account.create.mockResolvedValue({ id: 'account-1' });

      await service.registerAccount(dto, SESSION_CONTEXT);

      const [[createArgs]] = prisma.account.create.mock.calls as [
        [{ data: { email: string; profile: { create: unknown } } }],
      ];
      expect(createArgs.data.email).toBe(dto.email);
      expect(createArgs.data.profile.create).toEqual({
        name: dto.name,
        lastname: dto.lastname,
        username: dto.username,
        wallet: { create: {} },
      });
    });

    it('returns an access token and a refresh session', async () => {
      prisma.account.create.mockResolvedValue({ id: 'account-1' });

      await expect(
        service.registerAccount(dto, SESSION_CONTEXT),
      ).resolves.toEqual({
        accessToken: 'signed-token',
        refreshToken: 'refresh-token',
      });
      expect(tokenService.sign).toHaveBeenCalledWith('account-1');
      expect(sessionService.issue).toHaveBeenCalledWith(
        'account-1',
        SESSION_CONTEXT,
      );
    });
  });

  describe('loginAccount', () => {
    it('rejects an unknown account with 401', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(
        service.loginAccount(
          { email: 'a@b.c', password: 'irrelevant1' },
          SESSION_CONTEXT,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a wrong password with 401', async () => {
      prisma.account.findFirst.mockResolvedValue({
        id: 'account-1',
        password: await bcrypt.hash('correct-password', 10),
        status: AccountStatus.ACTIVE,
      });

      await expect(
        service.loginAccount(
          { email: 'a@b.c', password: 'wrong-password' },
          SESSION_CONTEXT,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a deleted account with 401', async () => {
      prisma.account.findFirst.mockResolvedValue({
        id: 'account-1',
        password: await bcrypt.hash('correct-password', 10),
        status: AccountStatus.DELETED,
      });

      await expect(
        service.loginAccount(
          { email: 'a@b.c', password: 'correct-password' },
          SESSION_CONTEXT,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a blocked account with 403', async () => {
      prisma.account.findFirst.mockResolvedValue({
        id: 'account-1',
        password: await bcrypt.hash('correct-password', 10),
        status: AccountStatus.BLOCKED,
      });

      await expect(
        service.loginAccount(
          { email: 'a@b.c', password: 'correct-password' },
          SESSION_CONTEXT,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns tokens and stamps lastLoginAt for valid credentials', async () => {
      prisma.account.findFirst.mockResolvedValue({
        id: 'account-1',
        password: await bcrypt.hash('correct-password', 10),
        status: AccountStatus.ACTIVE,
      });

      await expect(
        service.loginAccount(
          { username: 'johndoe', password: 'correct-password' },
          SESSION_CONTEXT,
        ),
      ).resolves.toEqual({
        accessToken: 'signed-token',
        refreshToken: 'refresh-token',
      });
      expect(prisma.account.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'account-1' },
          data: { lastLoginAt: expect.any(Date) as Date },
        }),
      );
    });
  });

  describe('refreshTokens', () => {
    it('rotates the session and returns fresh tokens', async () => {
      sessionService.rotate.mockResolvedValue({
        accountId: 'account-1',
        refreshToken: 'new-refresh-token',
      });
      prisma.account.findUnique.mockResolvedValue({
        status: AccountStatus.ACTIVE,
      });

      await expect(
        service.refreshTokens('old-refresh-token', SESSION_CONTEXT),
      ).resolves.toEqual({
        accessToken: 'signed-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('rejects a refresh for an inactive account', async () => {
      sessionService.rotate.mockResolvedValue({
        accountId: 'account-1',
        refreshToken: 'new-refresh-token',
      });
      prisma.account.findUnique.mockResolvedValue({
        status: AccountStatus.BLOCKED,
      });

      await expect(
        service.refreshTokens('old-refresh-token', SESSION_CONTEXT),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
