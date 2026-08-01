import type { WalletTransactionType } from '../../generated/prisma/enums';

export const WALLET_TRANSACTION_CREATED_PATTERN = 'wallet.transaction.created';

export interface IWalletTransactionCreatedEvent {
  transactionId: string;
  walletId: string;
  profileId: string;
  type: WalletTransactionType;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  currency: string;
  referenceId?: string;
  description?: string;
}
