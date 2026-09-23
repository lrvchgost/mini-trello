import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';
import type { AppEnv } from '../config/env';

/**
 * Socket.IO-адаптер поверх Redis Pub/Sub: события доски доставляются клиентам
 * всех инстансов backend. Публикация и подписка используют отдельные соединения;
 * соединения `RedisService` не переиспользуются, т.к. подписчик Activity уже занят.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly pubClient: Redis;
  private readonly subClient: Redis;
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplicationContext,
    private readonly env: AppEnv,
  ) {
    super(app);
    this.pubClient = new Redis(env.REDIS_URL);
    this.subClient = this.pubClient.duplicate();
  }

  connectToRedis(): void {
    this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: this.env.CORS_ORIGIN, credentials: true },
    }) as Server;

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  override async close(server: Server): Promise<void> {
    await super.close(server);
    await Promise.all([this.pubClient.quit(), this.subClient.quit()]);
  }
}
