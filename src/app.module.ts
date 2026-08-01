import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ApplicationExceptionFilter } from './common/filters/application-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ConfigurationModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AccountModule } from './modules/accounts/account.module';
import { AddressModule } from './modules/addresses/address.module';
import { CartModule } from './modules/carts/cart.module';
import { CategoryModule } from './modules/categories/category.module';
import { OrderModule } from './modules/orders/order.module';
import { PaymentModule } from './modules/payments/payment.module';
import { ProductModule } from './modules/products/product.module';
import { ProfileModule } from './modules/profiles/profile.module';
import { ReviewModule } from './modules/reviews/review.module';
import { StockModule } from './modules/stocks/stock.module';
import { StoreModule } from './modules/stores/store.module';
import { TransactionModule } from './modules/transactions/transaction.module';
import { WalletModule } from './modules/wallets/wallet.module';

@Module({
  imports: [
    ConfigurationModule,
    DatabaseModule,
    AccountModule,
    ProfileModule,
    AddressModule,
    WalletModule,
    StoreModule,
    CategoryModule,
    ProductModule,
    StockModule,
    CartModule,
    OrderModule,
    PaymentModule,
    ReviewModule,
    TransactionModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ApplicationExceptionFilter,
    },
  ],
})
export class AppModule {}
