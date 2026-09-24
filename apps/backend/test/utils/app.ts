import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { configureApp } from '../../src/setup-app';

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
  /** Заполнен только при `listen: true` — нужен для SSE/WebSocket. */
  baseUrl: string;
  close: () => Promise<void>;
}

export interface CreateTestAppOptions {
  /** Поднять HTTP-сервер на случайном порту (для реальных сокетов/SSE). */
  listen?: boolean;
}

/**
 * Единый bootstrap интеграционного приложения: тот же `AppModule` и
 * `configureApp`, что и в `main.ts`, чтобы тесты шли по реальному стеку.
 */
export async function createTestApp(options: CreateTestAppOptions = {}): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  let baseUrl = '';
  if (options.listen) {
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  }

  return {
    app,
    prisma: app.get(PrismaService),
    baseUrl,
    close: () => app.close(),
  };
}
