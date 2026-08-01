import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction } from '../entities/transaction.entity';
import { TTransactionDocument } from '../types/transaction-document';

@Injectable()
export class TransactionRepository {
  constructor(
    @InjectModel(Transaction.name)
    private readonly model: Model<Transaction>,
  ) {}

  create(transaction: Transaction): Promise<TTransactionDocument> {
    return this.model.create(transaction);
  }
}
