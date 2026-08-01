import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../../shared/auth/auth.module';
import { ProfileModule } from '../profiles/profile.module';
import { CartController } from './controllers/cart.controller';
import { CartService } from './services/cart.service';

@Module({
  imports: [DatabaseModule, AuthModule, ProfileModule],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
