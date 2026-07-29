import { Prisma } from '../../../generated/prisma/client';

export type BalanceClient = Pick<Prisma.TransactionClient, '$queryRaw'>;
