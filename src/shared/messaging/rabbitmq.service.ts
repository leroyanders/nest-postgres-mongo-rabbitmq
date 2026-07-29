import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { RABBITMQ_CLIENT } from './rabbitmq.symbols';

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(RABBITMQ_CLIENT)
    private readonly client: ClientProxy,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }

  async emit<TPayload>(pattern: string, payload: TPayload): Promise<void> {
    await firstValueFrom(this.client.emit<void, TPayload>(pattern, payload));
  }

  async send<TResult, TPayload>(
    pattern: string,
    payload: TPayload,
  ): Promise<TResult> {
    return firstValueFrom(
      this.client.send<TResult, TPayload>(pattern, payload),
    );
  }
}
