import { Prisma } from '../../../generated/prisma/client';
import {
  WalletTransactionStatus,
  WalletTransactionType,
} from '../../../generated/prisma/enums';

export interface WalletLedgerEntry {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  amount: Prisma.Decimal;
  balanceBefore: Prisma.Decimal;
  balanceAfter: Prisma.Decimal;
  currency: string;
  description: string | null;
  referenceId: string | null;
}
