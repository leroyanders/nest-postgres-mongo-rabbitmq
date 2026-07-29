import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { TransactionType } from '../../../shared/contracts/transaction-type';

@Schema({ collection: 'transactions', timestamps: true })
export class Transaction {
  @Prop({ required: true, index: true })
  declare accountId: string;

  @Prop({ required: true, type: String })
  declare type: TransactionType;

  @Prop({ required: true })
  declare amount: string;

  @Prop({ required: true })
  declare balance: string;

  @Prop()
  declare counterpartyId?: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
