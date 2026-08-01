import { HydratedDocument } from 'mongoose';
import { Transaction } from '../entities/transaction.entity';

export type TTransactionDocument = HydratedDocument<Transaction>;
