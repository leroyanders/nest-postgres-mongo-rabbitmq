import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../../shared/auth/auth.module';
import { MessagingModule } from '../../shared/messaging/messaging.module';
import { BalanceController } from './controllers/balance.controller';
import { BalanceService } from './services/balance.service';

@Module({
  imports: [DatabaseModule, AuthModule, MessagingModule],
  controllers: [BalanceController],
  providers: [BalanceService],
})
export class BalanceModule {}
