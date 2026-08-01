import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../../shared/auth/auth.module';
import { StoreController } from './controllers/store.controller';
import { StoreService } from './services/store.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [StoreController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
