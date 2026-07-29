import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { Channel, Message } from 'amqplib';
import { TRANSACTION_CREATED_PATTERN } from '../../../shared/contracts/transaction-created.event';
import type { TransactionCreatedEvent } from '../../../shared/contracts/transaction-created.event';
import { TransactionsService } from '../services/transactions.service';

@Controller()
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  @EventPattern(TRANSACTION_CREATED_PATTERN)
  async handleTransactionCreated(
    @Payload() payload: TransactionCreatedEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef() as Channel;
    const message = context.getMessage() as Message;

    try {
      await this.transactionsService.create(payload);
      this.logger.log(`Transaction recorded for account ${payload.accountId}`);

      channel.ack(message);
    } catch (error) {
      // Dead-letter the message instead of requeueing to avoid a poison
      // message being redelivered forever.
      channel.nack(message, false, false);
      throw error;
    }
  }
}
