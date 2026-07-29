import { Injectable } from '@nestjs/common';
import { TransactionCreatedEvent } from '../../../shared/contracts/transaction-created.event';
import { Transaction } from '../entities/transaction.entity';
import { TransactionsRepository } from '../repositories/transactions.repository';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
  ) {}

  async create(event: TransactionCreatedEvent): Promise<Transaction> {
    return this.transactionsRepository.create({
      accountId: event.accountId,
      type: event.type,
      amount: event.amount,
      balance: event.balance,
      counterpartyId: event.counterpartyId,
    });
  }
}
