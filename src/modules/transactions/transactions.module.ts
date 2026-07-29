import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionsController } from './controllers/transactions.controller';
import { Transaction, TransactionSchema } from './entities/transaction.entity';
import { TransactionsRepository } from './repositories/transactions.repository';
import { TransactionsService } from './services/transactions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsRepository, TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
