import { PrismaService } from '../../../database/services/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { WALLET_TRANSACTION_CREATED_PATTERN } from '../../../shared/contracts/wallet-transaction-created.event';
import { RabbitMqService } from '../../../shared/messaging/services/rabbitmq.service';
import { InsufficientFundsError } from '../errors/insufficient-funds.error';
import { InvalidAmountError } from '../errors/invalid-amount.error';
import { WalletNotFoundError } from '../errors/wallet-not-found.error';
import { WalletService } from './wallet.service';

const PROFILE_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const WALLET_ID = 'bbbbbbbb-0000-0000-0000-000000000002';

interface LedgerCreateArgs {
  data: {
    walletId: string;
    type: string;
    status: string;
    amount: Prisma.Decimal;
    balanceBefore: Prisma.Decimal;
    balanceAfter: Prisma.Decimal;
    currency: string;
    description?: string;
    referenceId?: string;
  };
}

describe('WalletService', () => {
  let tx: {
    $queryRaw: jest.Mock;
    walletTransaction: { create: jest.Mock };
    wallet: { findUnique: jest.Mock };
  };
  let prisma: { $transaction: jest.Mock };
  let rabbitMqService: { emit: jest.Mock };
  let service: WalletService;

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn(),
      walletTransaction: {
        create: jest.fn().mockImplementation(({ data }: LedgerCreateArgs) =>
          Promise.resolve({
            id: 'ledger-1',
            walletId: data.walletId,
            type: data.type,
            status: data.status,
            amount: data.amount,
            balanceBefore: data.balanceBefore,
            balanceAfter: data.balanceAfter,
            currency: data.currency,
            description: data.description ?? null,
            referenceId: data.referenceId ?? null,
          }),
        ),
      },
      wallet: { findUnique: jest.fn() },
    };
    prisma = {
      $transaction: jest
        .fn()
        .mockImplementation((fn: (client: unknown) => Promise<unknown>) =>
          fn(tx),
        ),
    };
    rabbitMqService = { emit: jest.fn().mockResolvedValue(undefined) };
    service = new WalletService(
      prisma as unknown as PrismaService,
      rabbitMqService as unknown as RabbitMqService,
    );
  });

  describe('withdraw', () => {
    it.each(['0', '-5'])(
      'rejects a non-positive amount (%s) without touching the database',
      async (amount) => {
        await expect(
          service.withdraw(PROFILE_ID, new Prisma.Decimal(amount)),
        ).rejects.toBeInstanceOf(InvalidAmountError);
        expect(prisma.$transaction).not.toHaveBeenCalled();
      },
    );

    it('throws when the balance is insufficient or the wallet is missing', async () => {
      tx.$queryRaw.mockResolvedValue([]);

      await expect(
        service.withdraw(PROFILE_ID, new Prisma.Decimal('100')),
      ).rejects.toBeInstanceOf(InsufficientFundsError);
      expect(tx.walletTransaction.create).not.toHaveBeenCalled();
      expect(rabbitMqService.emit).not.toHaveBeenCalled();
    });

    it('debits the wallet, records a ledger entry and publishes an event', async () => {
      tx.$queryRaw.mockResolvedValue([
        {
          id: WALLET_ID,
          balance: new Prisma.Decimal('90.50'),
          currency: 'UAH',
        },
      ]);

      const result = await service.withdraw(
        PROFILE_ID,
        new Prisma.Decimal('9.50'),
      );

      expect(result.balance.toString()).toBe('90.5');

      const [[ledgerArgs]] = tx.walletTransaction.create.mock.calls as [
        [LedgerCreateArgs],
      ];
      expect(ledgerArgs.data.type).toBe('WITHDRAWAL');
      expect(ledgerArgs.data.balanceBefore.toString()).toBe('100');
      expect(ledgerArgs.data.balanceAfter.toString()).toBe('90.5');

      expect(rabbitMqService.emit).toHaveBeenCalledWith(
        WALLET_TRANSACTION_CREATED_PATTERN,
        expect.objectContaining({
          transactionId: 'ledger-1',
          walletId: WALLET_ID,
          profileId: PROFILE_ID,
          type: 'WITHDRAWAL',
          amount: '9.5',
          balanceBefore: '100',
          balanceAfter: '90.5',
          currency: 'UAH',
        }),
      );
    });

    it('does not fail the withdrawal when event publishing fails', async () => {
      tx.$queryRaw.mockResolvedValue([
        { id: WALLET_ID, balance: new Prisma.Decimal('1'), currency: 'UAH' },
      ]);
      rabbitMqService.emit.mockRejectedValue(new Error('broker down'));

      const result = await service.withdraw(PROFILE_ID, new Prisma.Decimal(1));

      expect(result.balance.toString()).toBe('1');
      await new Promise((resolve) => process.nextTick(resolve));
    });
  });

  describe('deposit', () => {
    it('rejects a non-positive amount before any lookup', async () => {
      await expect(
        service.deposit(PROFILE_ID, new Prisma.Decimal('0')),
      ).rejects.toBeInstanceOf(InvalidAmountError);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws when the wallet does not exist', async () => {
      tx.$queryRaw.mockResolvedValue([]);

      await expect(
        service.deposit(PROFILE_ID, new Prisma.Decimal('10')),
      ).rejects.toBeInstanceOf(WalletNotFoundError);
      expect(rabbitMqService.emit).not.toHaveBeenCalled();
    });

    it('credits the wallet and publishes a deposit event', async () => {
      tx.$queryRaw.mockResolvedValue([
        {
          id: WALLET_ID,
          balance: new Prisma.Decimal('130'),
          currency: 'UAH',
        },
      ]);

      const result = await service.deposit(
        PROFILE_ID,
        new Prisma.Decimal('30'),
      );

      expect(result.balance.toString()).toBe('130');

      const [[ledgerArgs]] = tx.walletTransaction.create.mock.calls as [
        [LedgerCreateArgs],
      ];
      expect(ledgerArgs.data.type).toBe('DEPOSIT');
      expect(ledgerArgs.data.balanceBefore.toString()).toBe('100');

      expect(rabbitMqService.emit).toHaveBeenCalledWith(
        WALLET_TRANSACTION_CREATED_PATTERN,
        expect.objectContaining({
          type: 'DEPOSIT',
          amount: '30',
          balanceAfter: '130',
        }),
      );
    });
  });

  describe('chargeOrderPayment', () => {
    it('rejects a payment when the wallet currency differs', async () => {
      tx.wallet.findUnique.mockResolvedValue({ currency: 'USD' });

      await expect(
        service.chargeOrderPayment(
          tx as never,
          PROFILE_ID,
          new Prisma.Decimal('10'),
          'UAH',
          'order-1',
        ),
      ).rejects.toMatchObject({ code: 'CURRENCY_MISMATCH' });
      expect(tx.$queryRaw).not.toHaveBeenCalled();
    });

    it('debits the wallet with the order as the ledger reference', async () => {
      tx.wallet.findUnique.mockResolvedValue({ currency: 'UAH' });
      tx.$queryRaw.mockResolvedValue([
        { id: WALLET_ID, balance: new Prisma.Decimal('70'), currency: 'UAH' },
      ]);

      const entry = await service.chargeOrderPayment(
        tx as never,
        PROFILE_ID,
        new Prisma.Decimal('30'),
        'UAH',
        'order-1',
      );

      expect(entry.type).toBe('PAYMENT');
      expect(entry.referenceId).toBe('order-1');
      expect(entry.balanceAfter.toString()).toBe('70');
    });
  });
});
