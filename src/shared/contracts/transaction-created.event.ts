import { TransactionType } from './transaction-type';

export const TRANSACTION_CREATED_PATTERN = 'transaction.created';

export interface TransactionCreatedEvent {
  accountId: string;
  amount: string;
  balance: string;
  type: TransactionType;
  counterpartyId?: string;
}
