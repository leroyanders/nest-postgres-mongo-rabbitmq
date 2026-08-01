import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../../shared/auth/auth.module';
import { ProfileModule } from '../profiles/profile.module';
import { AddressController } from './controllers/address.controller';
import { AddressService } from './services/address.service';

@Module({
  imports: [DatabaseModule, AuthModule, ProfileModule],
  controllers: [AddressController],
  providers: [AddressService],
})
export class AddressModule {}
