import { HydratedDocument } from 'mongoose';
import { Transaction } from '../entities/transaction.entity';

export type TransactionDocument = HydratedDocument<Transaction>;
