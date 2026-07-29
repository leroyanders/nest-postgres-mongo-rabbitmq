import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from '../entities/transaction.entity';
import { TransactionDocument } from '../types/transaction-document';

@Injectable()
export class TransactionsRepository {
  constructor(
    @InjectModel(Transaction.name)
    private readonly model: Model<Transaction>,
  ) {}

  create(transaction: Transaction): Promise<TransactionDocument> {
    return this.model.create(transaction);
  }
}
