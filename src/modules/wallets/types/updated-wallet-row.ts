import { Prisma } from '../../../generated/prisma/client';

export interface UpdatedWalletRow {
  id: string;
  balance: Prisma.Decimal;
  currency: string;
}
