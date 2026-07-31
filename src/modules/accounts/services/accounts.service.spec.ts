import { UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PrismaService } from '../../../database/services/prisma.service';
import { TokenService } from '../../../shared/auth/services/token.service';
import { SignUpAccountDto } from '../dtos/sign-up-account.dto';
import { AccountsService } from './accounts.service';

describe('AccountsService', () => {
  let prisma: {
    account: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
  };
  let tokenService: { sign: jest.Mock };
  let service: AccountsService;

  beforeEach(() => {
    prisma = {
      account: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
    };
    tokenService = { sign: jest.fn().mockReturnValue('signed-token') };
    service = new AccountsService(
      prisma as unknown as PrismaService,
      tokenService as unknown as TokenService,
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

      await service.registerAccount(dto);

      const [[createArgs]] = prisma.account.create.mock.calls as [
        [{ data: { password: string } }],
      ];
      expect(createArgs.data.password).not.toBe(dto.password);
      await expect(
        bcrypt.compare(dto.password, createArgs.data.password),
      ).resolves.toBe(true);
    });

    it('creates the profile together with the account', async () => {
      prisma.account.create.mockResolvedValue({ id: 'account-1' });

      await service.registerAccount(dto);

      const [[createArgs]] = prisma.account.create.mock.calls as [
        [{ data: { email: string; profile: { create: unknown } } }],
      ];
      expect(createArgs.data.email).toBe(dto.email);
      expect(createArgs.data.profile.create).toEqual({
        name: dto.name,
        lastname: dto.lastname,
        username: dto.username,
      });
    });

    it('returns a token signed for the created account id', async () => {
      prisma.account.create.mockResolvedValue({ id: 'account-1' });

      await expect(service.registerAccount(dto)).resolves.toEqual({
        token: 'signed-token',
      });
      expect(tokenService.sign).toHaveBeenCalledWith('account-1');
    });
  });

  describe('loginAccount', () => {
    it('rejects an unknown account with 401', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(
        service.loginAccount({ email: 'a@b.c', password: 'irrelevant1' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a wrong password with 401', async () => {
      prisma.account.findFirst.mockResolvedValue({
        id: 'account-1',
        password: await bcrypt.hash('correct-password', 10),
      });

      await expect(
        service.loginAccount({ email: 'a@b.c', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns a token for valid credentials', async () => {
      prisma.account.findFirst.mockResolvedValue({
        id: 'account-1',
        password: await bcrypt.hash('correct-password', 10),
      });

      await expect(
        service.loginAccount({
          username: 'johndoe',
          password: 'correct-password',
        }),
      ).resolves.toEqual({ token: 'signed-token' });
      expect(tokenService.sign).toHaveBeenCalledWith('account-1');
    });
  });
});
