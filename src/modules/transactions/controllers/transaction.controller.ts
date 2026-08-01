import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { Channel, Message } from 'amqplib';
import { WALLET_TRANSACTION_CREATED_PATTERN } from '../../../shared/contracts/wallet-transaction-created.event';
import type { WalletTransactionCreatedEvent } from '../../../shared/contracts/wallet-transaction-created.event';
import { TransactionService } from '../services/transaction.service';

@Controller()
export class TransactionController {
  private readonly logger = new Logger(TransactionController.name);

  constructor(private readonly transactionService: TransactionService) {}

  @EventPattern(WALLET_TRANSACTION_CREATED_PATTERN)
  async handleWalletTransactionCreated(
    @Payload() payload: WalletTransactionCreatedEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef() as Channel;
    const message = context.getMessage() as Message;

    try {
      await this.transactionService.create(payload);
      this.logger.log(
        `Wallet transaction ${payload.transactionId} recorded for wallet ${payload.walletId}`,
      );

      channel.ack(message);
    } catch (error) {
      // Dead-letter the message instead of requeueing to avoid a poison
      // message being redelivered forever.
      channel.nack(message, false, false);
      throw error;
    }
  }
}
