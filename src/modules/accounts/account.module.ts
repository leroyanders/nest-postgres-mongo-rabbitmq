import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../../shared/auth/auth.module';
import { AccountController } from './controllers/account.controller';
import { AccountService } from './services/account.service';
import { SessionService } from './services/session.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AccountController],
  providers: [AccountService, SessionService],
})
export class AccountModule {}
