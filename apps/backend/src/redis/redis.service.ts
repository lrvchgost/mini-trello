import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { APP_ENV, type AppEnv } from '../config/env';

/**
 * Общие Redis-соединения. Для Pub/Sub нужны отдельные клиенты: подписчик,
 * находясь в режиме подписки, не может выполнять обычные команды.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly publisher: Redis;
  readonly subscriber: Redis;

  constructor(@Inject(APP_ENV) env: AppEnv) {
    this.publisher = new Redis(env.REDIS_URL);
    this.subscriber = new Redis(env.REDIS_URL);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.publisher.quit(), this.subscriber.quit()]);
  }
}
