import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import {
  TRANSACTION_CREATED_PATTERN,
  TransactionCreatedEvent,
} from '../../../shared/contracts/transaction-created.event';
import { RabbitMqService } from '../../../shared/messaging/rabbitmq.service';
import { InsufficientFundsError } from '../errors/insufficient-funds.error';
import { InvalidAmountError } from '../errors/invalid-amount.error';
import { RecipientNotFoundError } from '../errors/recipient-not-found.error';
import { SelfTransferError } from '../errors/self-transfer.error';
import { BalanceClient } from '../types/balance-client';
import { UpdatedBalanceRow } from '../types/updated-balance-row';

@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMqService: RabbitMqService,
  ) {}

  async withdraw(
    accountId: string,
    amount: Prisma.Decimal,
  ): Promise<{ balance: Prisma.Decimal }> {
    if (amount.lessThanOrEqualTo(0)) {
      throw new InvalidAmountError();
    }

    const balance = await this.debit(this.prisma, accountId, amount);

    this.publishTransactionCreated({
      accountId,
      amount: amount.toString(),
      balance: balance.toString(),
      type: 'withdrawal',
    });

    return { balance };
  }

  async transfer(
    senderId: string,
    recipientUsername: string,
    amount: Prisma.Decimal,
  ): Promise<{ balance: Prisma.Decimal }> {
    if (amount.lessThanOrEqualTo(0)) {
      throw new InvalidAmountError();
    }

    const recipient = await this.prisma.account.findUnique({
      select: { id: true },
      where: { username: recipientUsername },
    });

    if (!recipient) {
      throw new RecipientNotFoundError();
    }

    if (recipient.id === senderId) {
      throw new SelfTransferError();
    }

    const { senderBalance, recipientBalance } = await this.prisma.$transaction(
      async (tx) => {
        if (senderId < recipient.id) {
          const debited = await this.debit(tx, senderId, amount);
          const credited = await this.credit(tx, recipient.id, amount);
          return { senderBalance: debited, recipientBalance: credited };
        }

        const credited = await this.credit(tx, recipient.id, amount);
        const debited = await this.debit(tx, senderId, amount);
        return { senderBalance: debited, recipientBalance: credited };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );

    this.publishTransactionCreated({
      accountId: senderId,
      amount: amount.toString(),
      balance: senderBalance.toString(),
      type: 'transfer_out',
      counterpartyId: recipient.id,
    });
    this.publishTransactionCreated({
      accountId: recipient.id,
      amount: amount.toString(),
      balance: recipientBalance.toString(),
      type: 'transfer_in',
      counterpartyId: senderId,
    });

    return { balance: senderBalance };
  }

  private async debit(
    client: BalanceClient,
    accountId: string,
    amount: Prisma.Decimal,
  ): Promise<Prisma.Decimal> {
    const rows = await client.$queryRaw<UpdatedBalanceRow[]>`
      UPDATE "accounts"
      SET "balance" = "balance" - ${amount}
      WHERE "id" = ${accountId}::uuid
        AND "balance" >= ${amount}
      RETURNING "balance"
    `;

    const row = rows[0];
    if (!row) {
      throw new InsufficientFundsError();
    }

    return row.balance;
  }

  private async credit(
    client: BalanceClient,
    accountId: string,
    amount: Prisma.Decimal,
  ): Promise<Prisma.Decimal> {
    const rows = await client.$queryRaw<UpdatedBalanceRow[]>`
      UPDATE "accounts"
      SET "balance" = "balance" + ${amount}
      WHERE "id" = ${accountId}::uuid
      RETURNING "balance"
    `;

    const row = rows[0];
    if (!row) {
      throw new RecipientNotFoundError();
    }

    return row.balance;
  }

  private publishTransactionCreated(event: TransactionCreatedEvent): void {
    this.rabbitMqService
      .emit(TRANSACTION_CREATED_PATTERN, event)
      .catch((error: unknown) => {
        this.logger.error(
          `Failed to publish ${TRANSACTION_CREATED_PATTERN} event for account ${event.accountId}`,
          error instanceof Error ? error.stack : String(error),
        );
      });
  }
}
