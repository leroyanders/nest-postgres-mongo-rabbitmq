import { Prisma } from '../../../generated/prisma/client';

export interface IUpdatedWalletRow {
  id: string;
  balance: Prisma.Decimal;
  currency: string;
}
