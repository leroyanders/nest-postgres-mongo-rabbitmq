import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppConfig } from '../../config/types/app-config';
import { RabbitMqService } from './rabbitmq.service';
import { RABBITMQ_CLIENT } from './rabbitmq.symbols';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: RABBITMQ_CLIENT,
        inject: [ConfigService],
        useFactory: (configService: ConfigService<AppConfig, true>) => {
          const url = configService.get<string>('rabbitmq.url', {
            infer: true,
          });
          const queue = configService.get<string>('rabbitmq.queue', {
            infer: true,
          });

          return {
            transport: Transport.RMQ,
            options: {
              urls: [url],
              queue,
              queueOptions: {
                durable: true,
              },
            },
          };
        },
      },
    ]),
  ],
  providers: [RabbitMqService],
  exports: [RabbitMqService],
})
export class MessagingModule {}
