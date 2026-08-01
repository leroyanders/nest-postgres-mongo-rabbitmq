import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../../shared/auth/auth.module';
import { StoreModule } from '../stores/store.module';
import { StockController } from './controllers/stock.controller';
import { StockService } from './services/stock.service';

@Module({
  imports: [DatabaseModule, AuthModule, StoreModule],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
