import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../../shared/auth/auth.module';
import { AccountsController } from './controllers/accounts.controller';
import { AccountsService } from './services/accounts.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AccountsController],
  providers: [AccountsService],
})
export class AccountsModule {}
