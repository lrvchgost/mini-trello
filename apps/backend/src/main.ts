import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WinstonLogger } from './common/logger/winston.logger';
import { APP_ENV, type AppEnv } from './config/env';
import { RedisIoAdapter } from './realtime/redis-io.adapter';
import { configureApp } from './setup-app';

async function bootstrap(): Promise<void> {
  const logger = new WinstonLogger();
  const app = await NestFactory.create(AppModule, { bufferLogs: true, logger });
  const env = app.get<AppEnv>(APP_ENV);

  const redisIoAdapter = new RedisIoAdapter(app, env);
  redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  configureApp(app);
  app.enableShutdownHooks();

  await app.listen(env.PORT);
  logger.log(`API listening on http://localhost:${env.PORT}/api`, 'Bootstrap');
}

void bootstrap();
