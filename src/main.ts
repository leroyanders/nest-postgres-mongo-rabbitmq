import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { AppConfig } from './config/types/app-config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService<AppConfig, true>);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  const rabbitmqUrl: string = configService.get('rabbitmq.url', {
    infer: true,
  });
  const rabbitmqQueue: string = configService.get('rabbitmq.queue', {
    infer: true,
  });

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
