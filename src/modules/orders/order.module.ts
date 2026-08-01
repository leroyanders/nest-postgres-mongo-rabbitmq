import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../../shared/auth/auth.module';
import { PaymentModule } from '../payments/payment.module';
import { ProfileModule } from '../profiles/profile.module';
import { StockModule } from '../stocks/stock.module';
import { WalletModule } from '../wallets/wallet.module';
import { OrderController } from './controllers/order.controller';
import { OrderService } from './services/order.service';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ProfileModule,
    StockModule,
    PaymentModule,
    WalletModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
