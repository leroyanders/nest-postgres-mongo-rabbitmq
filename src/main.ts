import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { IAppConfig } from './config/types/app-config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<IAppConfig, true>);
  const rabbitmqUrl = configService.get<string>('rabbitmq.url', {
    infer: true,
  });
  const rabbitmqQueue = configService.get<string>('rabbitmq.queue', {
    infer: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: rabbitmqQueue,
      queueOptions: {
        durable: true,
      },
      noAck: false,
      prefetchCount: 10,
    },
  });

  await app.startAllMicroservices();
  await app.listen(configService.get('port', { infer: true }));
}

void bootstrap();
