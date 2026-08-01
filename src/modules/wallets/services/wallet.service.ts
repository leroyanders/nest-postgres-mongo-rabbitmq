import { Injectable, Logger } from '@nestjs/common';
import {
  DEFAULT_PAGE_SIZE,
  PaginationQueryDto,
} from '../../../common/dtos/pagination-query.dto';
import { PrismaService } from '../../../database/services/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import {
  WalletTransactionStatus,
  WalletTransactionType,
} from '../../../generated/prisma/enums';
import {
  WALLET_TRANSACTION_CREATED_PATTERN,
  IWalletTransactionCreatedEvent,
} from '../../../shared/contracts/wallet-transaction-created.event';
import { RabbitMqService } from '../../../shared/messaging/services/rabbitmq.service';
import { CurrencyMismatchError } from '../errors/currency-mismatch.error';
import { InsufficientFundsError } from '../errors/insufficient-funds.error';
import { InvalidAmountError } from '../errors/invalid-amount.error';
import { WalletNotFoundError } from '../errors/wallet-not-found.error';
import { IUpdatedWalletRow } from '../types/updated-wallet-row';
import { IWalletLedgerEntry } from '../types/wallet-ledger-entry';

const LEDGER_SELECT = {
  id: true,
  walletId: true,
  type: true,
  status: true,
  amount: true,
  balanceBefore: true,
  balanceAfter: true,
  currency: true,
  description: true,
  referenceId: true,
} as const;

interface LedgerOptions {
  type: WalletTransactionType;
  description?: string;
  referenceId?: string;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMqService: RabbitMqService,
  ) {}

  getWallet(profileId: string) {
    return this.prisma.wallet.findUniqueOrThrow({
      select: { id: true, balance: true, currency: true, createdAt: true },
      where: { profileId },
    });
  }

  async listTransactions(profileId: string, pagination: PaginationQueryDto) {
    const wallet = await this.prisma.wallet.findUniqueOrThrow({
      select: { id: true },
      where: { profileId },
    });

    return this.prisma.walletTransaction.findMany({
      select: { ...LEDGER_SELECT, createdAt: true, completedAt: true },
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: pagination.take ?? DEFAULT_PAGE_SIZE,
      skip: pagination.skip ?? 0,
    });
  }

  async deposit(
    profileId: string,
    amount: Prisma.Decimal,
    description?: string,
  ): Promise<{ balance: Prisma.Decimal }> {
    this.assertPositive(amount);

    const entry = await this.prisma.$transaction((tx) =>
      this.credit(tx, profileId, amount, {
        type: WalletTransactionType.DEPOSIT,
        description,
      }),
    );

    this.publishLedgerEvent(profileId, entry);

    return { balance: entry.balanceAfter };
  }

  async withdraw(
    profileId: string,
    amount: Prisma.Decimal,
    description?: string,
  ): Promise<{ balance: Prisma.Decimal }> {
    this.assertPositive(amount);

    const entry = await this.prisma.$transaction((tx) =>
      this.debit(tx, profileId, amount, {
        type: WalletTransactionType.WITHDRAWAL,
        description,
      }),
    );

    this.publishLedgerEvent(profileId, entry);

    return { balance: entry.balanceAfter };
  }

  /**
   * Debits the wallet as payment for an order. Runs inside the caller's
   * transaction; the caller must publish the returned ledger entry with
   * publishLedgerEvent() after the transaction commits.
   */
  async chargeOrderPayment(
    tx: Prisma.TransactionClient,
    profileId: string,
    amount: Prisma.Decimal,
    currency: string,
    orderId: string,
  ): Promise<IWalletLedgerEntry> {
    this.assertPositive(amount);
    await this.assertCurrency(tx, profileId, currency);

    return this.debit(tx, profileId, amount, {
      type: WalletTransactionType.PAYMENT,
      referenceId: orderId,
      description: 'Order payment',
    });
  }

  /**
   * Credits the wallet back when an order payment is refunded. Runs inside
   * the caller's transaction, see chargeOrderPayment().
   */
  async refundOrderPayment(
    tx: Prisma.TransactionClient,
    profileId: string,
    amount: Prisma.Decimal,
    currency: string,
    orderId: string,
  ): Promise<IWalletLedgerEntry> {
    this.assertPositive(amount);
    await this.assertCurrency(tx, profileId, currency);

    return this.credit(tx, profileId, amount, {
      type: WalletTransactionType.REFUND,
      referenceId: orderId,
      description: 'Order refund',
    });
  }

  publishLedgerEvent(profileId: string, entry: IWalletLedgerEntry): void {
    const event: IWalletTransactionCreatedEvent = {
      transactionId: entry.id,
      walletId: entry.walletId,
      profileId,
      type: entry.type,
      amount: entry.amount.toString(),
      balanceBefore: entry.balanceBefore.toString(),
      balanceAfter: entry.balanceAfter.toString(),
      currency: entry.currency,
      referenceId: entry.referenceId ?? undefined,
      description: entry.description ?? undefined,
    };

    this.rabbitMqService
      .emit(WALLET_TRANSACTION_CREATED_PATTERN, event)
      .catch((error: unknown) => {
        this.logger.error(
          `Failed to publish ${WALLET_TRANSACTION_CREATED_PATTERN} event for wallet ${entry.walletId}`,
          error instanceof Error ? error.stack : String(error),
        );
      });
  }

  private async debit(
    tx: Prisma.TransactionClient,
    profileId: string,
    amount: Prisma.Decimal,
    options: LedgerOptions,
  ): Promise<IWalletLedgerEntry> {
    const rows = await tx.$queryRaw<IUpdatedWalletRow[]>`
      UPDATE "wallets"
      SET "balance" = "balance" - ${amount}, "updatedAt" = now()
      WHERE "profileId" = ${profileId}::uuid
        AND "balance" >= ${amount}
      RETURNING "id", "balance", "currency"
    `;

    const row = rows[0];
    if (!row) {
      throw new InsufficientFundsError();
    }

    return this.recordLedgerEntry(
      tx,
      row,
      amount,
      row.balance.plus(amount),
      options,
    );
  }

  private async credit(
    tx: Prisma.TransactionClient,
    profileId: string,
    amount: Prisma.Decimal,
    options: LedgerOptions,
  ): Promise<IWalletLedgerEntry> {
    const rows = await tx.$queryRaw<IUpdatedWalletRow[]>`
      UPDATE "wallets"
      SET "balance" = "balance" + ${amount}, "updatedAt" = now()
      WHERE "profileId" = ${profileId}::uuid
      RETURNING "id", "balance", "currency"
    `;

    const row = rows[0];
    if (!row) {
      throw new WalletNotFoundError();
    }

    return this.recordLedgerEntry(
      tx,
      row,
      amount,
      row.balance.minus(amount),
      options,
    );
  }

  private recordLedgerEntry(
    tx: Prisma.TransactionClient,
    wallet: IUpdatedWalletRow,
    amount: Prisma.Decimal,
    balanceBefore: Prisma.Decimal,
    options: LedgerOptions,
  ): Promise<IWalletLedgerEntry> {
    return tx.walletTransaction.create({
      select: LEDGER_SELECT,
      data: {
        walletId: wallet.id,
        type: options.type,
        status: WalletTransactionStatus.COMPLETED,
        amount,
        balanceBefore,
        balanceAfter: wallet.balance,
        currency: wallet.currency,
        description: options.description,
        referenceId: options.referenceId,
        completedAt: new Date(),
      },
    });
  }

  private async assertCurrency(
    tx: Prisma.TransactionClient,
    profileId: string,
    currency: string,
  ): Promise<void> {
    const wallet = await tx.wallet.findUnique({
      select: { currency: true },
      where: { profileId },
    });

    if (!wallet) {
      throw new WalletNotFoundError();
    }

    if (wallet.currency !== currency) {
      throw new CurrencyMismatchError(currency, wallet.currency);
    }
  }

  private assertPositive(amount: Prisma.Decimal): void {
    if (amount.lessThanOrEqualTo(0)) {
      throw new InvalidAmountError();
    }
  }
}
