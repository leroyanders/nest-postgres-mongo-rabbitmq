import { PrismaService } from '../../../database/services/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import { TRANSACTION_CREATED_PATTERN } from '../../../shared/contracts/transaction-created.event';
import { RabbitMqService } from '../../../shared/messaging/rabbitmq.service';
import { InsufficientFundsError } from '../errors/insufficient-funds.error';
import { InvalidAmountError } from '../errors/invalid-amount.error';
import { RecipientNotFoundError } from '../errors/recipient-not-found.error';
import { SelfTransferError } from '../errors/self-transfer.error';
import { BalanceService } from './balance.service';

const SENDER_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const RECIPIENT_ID = 'bbbbbbbb-0000-0000-0000-000000000002';

describe('BalanceService', () => {
  let prisma: {
    $queryRaw: jest.Mock;
    $transaction: jest.Mock;
    account: { findUnique: jest.Mock };
  };
  let tx: { $queryRaw: jest.Mock };
  let rabbitMqService: { emit: jest.Mock };
  let service: BalanceService;

  beforeEach(() => {
    tx = { $queryRaw: jest.fn() };
    prisma = {
      $queryRaw: jest.fn(),
      $transaction: jest
        .fn()
        .mockImplementation((fn: (client: unknown) => Promise<unknown>) =>
          fn(tx),
        ),
      account: { findUnique: jest.fn() },
    };
    rabbitMqService = { emit: jest.fn().mockResolvedValue(undefined) };
    service = new BalanceService(
      prisma as unknown as PrismaService,
      rabbitMqService as unknown as RabbitMqService,
    );
  });

  describe('withdraw', () => {
    it.each(['0', '-5'])(
      'rejects a non-positive amount (%s) without touching the database',
      async (amount) => {
        await expect(
          service.withdraw(SENDER_ID, new Prisma.Decimal(amount)),
        ).rejects.toBeInstanceOf(InvalidAmountError);
        expect(prisma.$queryRaw).not.toHaveBeenCalled();
      },
    );

    it('throws when the balance is insufficient or the account is missing', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(
        service.withdraw(SENDER_ID, new Prisma.Decimal('100')),
      ).rejects.toBeInstanceOf(InsufficientFundsError);
      expect(rabbitMqService.emit).not.toHaveBeenCalled();
    });

    it('returns the new balance and publishes a withdrawal event', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { balance: new Prisma.Decimal('90.50') },
      ]);

      const result = await service.withdraw(
        SENDER_ID,
        new Prisma.Decimal('9.50'),
      );

      expect(result.balance.toString()).toBe('90.5');
      expect(rabbitMqService.emit).toHaveBeenCalledWith(
        TRANSACTION_CREATED_PATTERN,
        {
          accountId: SENDER_ID,
          amount: '9.5',
          balance: '90.5',
          type: 'withdrawal',
        },
      );
    });

    it('does not fail the withdrawal when event publishing fails', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { balance: new Prisma.Decimal('1') },
      ]);
      rabbitMqService.emit.mockRejectedValue(new Error('broker down'));

      const result = await service.withdraw(SENDER_ID, new Prisma.Decimal(1));

      expect(result.balance.toString()).toBe('1');
      await new Promise((resolve) => process.nextTick(resolve));
    });
  });

  describe('transfer', () => {
    it('rejects a non-positive amount before any lookup', async () => {
      await expect(
        service.transfer(SENDER_ID, 'recipient', new Prisma.Decimal('0')),
      ).rejects.toBeInstanceOf(InvalidAmountError);
      expect(prisma.account.findUnique).not.toHaveBeenCalled();
    });

    it('throws when the recipient does not exist', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(
        service.transfer(SENDER_ID, 'ghost', new Prisma.Decimal('10')),
      ).rejects.toBeInstanceOf(RecipientNotFoundError);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a transfer to your own account', async () => {
      prisma.account.findUnique.mockResolvedValue({ id: SENDER_ID });

      await expect(
        service.transfer(SENDER_ID, 'myself', new Prisma.Decimal('10')),
      ).rejects.toBeInstanceOf(SelfTransferError);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('debits the sender, credits the recipient and publishes both events', async () => {
      prisma.account.findUnique.mockResolvedValue({ id: RECIPIENT_ID });
      tx.$queryRaw
        .mockResolvedValueOnce([{ balance: new Prisma.Decimal('70') }])
        .mockResolvedValueOnce([{ balance: new Prisma.Decimal('130') }]);

      const result = await service.transfer(
        SENDER_ID,
        'recipient',
        new Prisma.Decimal('30'),
      );

      expect(result.balance.toString()).toBe('70');
      expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
      expect(rabbitMqService.emit).toHaveBeenCalledWith(
        TRANSACTION_CREATED_PATTERN,
        {
          accountId: SENDER_ID,
          amount: '30',
          balance: '70',
          type: 'transfer_out',
          counterpartyId: RECIPIENT_ID,
        },
      );
      expect(rabbitMqService.emit).toHaveBeenCalledWith(
        TRANSACTION_CREATED_PATTERN,
        {
          accountId: RECIPIENT_ID,
          amount: '30',
          balance: '130',
          type: 'transfer_in',
          counterpartyId: SENDER_ID,
        },
      );
    });

    it('credits first when the recipient id orders before the sender id', async () => {
      prisma.account.findUnique.mockResolvedValue({ id: SENDER_ID });
      tx.$queryRaw
        .mockResolvedValueOnce([{ balance: new Prisma.Decimal('130') }])
        .mockResolvedValueOnce([{ balance: new Prisma.Decimal('70') }]);

      const result = await service.transfer(
        RECIPIENT_ID,
        'recipient',
        new Prisma.Decimal('30'),
      );

      expect(result.balance.toString()).toBe('70');
      expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('propagates insufficient funds from inside the transaction without publishing', async () => {
      prisma.account.findUnique.mockResolvedValue({ id: RECIPIENT_ID });
      tx.$queryRaw.mockResolvedValueOnce([]);

      await expect(
        service.transfer(SENDER_ID, 'recipient', new Prisma.Decimal('1000')),
      ).rejects.toBeInstanceOf(InsufficientFundsError);
      expect(rabbitMqService.emit).not.toHaveBeenCalled();
    });
  });
});
