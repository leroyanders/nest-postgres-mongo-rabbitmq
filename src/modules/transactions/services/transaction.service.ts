import { Injectable } from '@nestjs/common';
import { WalletTransactionCreatedEvent } from '../../../shared/contracts/wallet-transaction-created.event';
import { Transaction } from '../entities/transaction.entity';
import { TransactionRepository } from '../repositories/transaction.repository';

@Injectable()
export class TransactionService {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async create(event: WalletTransactionCreatedEvent): Promise<Transaction> {
    return this.transactionRepository.create({
      transactionId: event.transactionId,
      walletId: event.walletId,
      profileId: event.profileId,
      type: event.type,
      amount: event.amount,
      balanceBefore: event.balanceBefore,
      balanceAfter: event.balanceAfter,
      currency: event.currency,
      referenceId: event.referenceId,
      description: event.description,
    });
  }
}
