import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../../shared/auth/auth.module';
import { StoreModule } from '../stores/store.module';
import { ProductController } from './controllers/product.controller';
import { ProductService } from './services/product.service';

@Module({
  imports: [DatabaseModule, AuthModule, StoreModule],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
