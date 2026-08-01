import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { WalletTransactionType } from '../../../generated/prisma/enums';

/**
 * Read-side audit copy of a wallet ledger entry, populated from
 * wallet.transaction.created events. The source of truth is the
 * wallet_transactions table in Postgres.
 */
@Schema({ collection: 'transactions', timestamps: true })
export class Transaction {
  @Prop({ required: true, unique: true })
  declare transactionId: string;

  @Prop({ required: true, index: true })
  declare walletId: string;

  @Prop({ required: true, index: true })
  declare profileId: string;

  @Prop({ required: true, type: String })
  declare type: WalletTransactionType;

  @Prop({ required: true })
  declare amount: string;

  @Prop({ required: true })
  declare balanceBefore: string;

  @Prop({ required: true })
  declare balanceAfter: string;

  @Prop({ required: true })
  declare currency: string;

  @Prop({ index: true })
  declare referenceId?: string;

  @Prop()
  declare description?: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
