import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { IAppConfig } from '../config/types/app-config';
import { PrismaService } from './services/prisma.service';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<IAppConfig, true>) => ({
        uri: configService.get('database.mongodb.url', { infer: true }),
      }),
    }),
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
