# 07 — Инфраструктура

## Назначение

Docker Compose, CI/CD, переменные окружения, dev-инструменты.

---

## 1. Docker Compose

```yaml
# docker-compose.yml (в корне репозитория)
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./docker/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      backend:
        condition: service_healthy
      frontend:
        condition: service_started

  frontend:
    build:
      context: .
      dockerfile: docker/frontend.Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL:-/api}   # Vite «запекает» env на этапе сборки
    depends_on:
      - backend

  backend:
    build:
      context: .
      dockerfile: docker/backend.Dockerfile
    # `${VAR:-default}`: дефолты позволяют `docker compose up` без .env, а `.env` переопределяет
    environment:
      - DATABASE_URL=${DATABASE_URL:-postgresql://postgres:postgres@db:5432/min_trello}
      - REDIS_URL=${REDIS_URL:-redis://redis:6379}
      - JWT_SECRET=${JWT_SECRET:-super-secret-key}
      - CORS_ORIGIN=${CORS_ORIGIN:-http://localhost}
      - COOKIE_SECURE=${COOKIE_SECURE:-false}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: min_trello
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d min_trello"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
  redisdata:
```

**Nginx** (`docker/nginx.conf`) — единая точка входа: отдаёт SPA, проксирует API, WebSocket и SSE:

```nginx
worker_processes auto;
events { worker_connections 1024; }

http {
  include  /etc/nginx/mime.types;
  sendfile on;

  map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
  }

  upstream backend  { server backend:3000; }
  upstream frontend { server frontend:80; }

  server {
    listen 80;

    # SSE (activity): без буферизации, долгий таймаут
    location ~ ^/api/boards/[^/]+/activity/stream$ {
      proxy_pass http://backend;
      proxy_http_version 1.1;
      proxy_set_header Connection '';
      proxy_buffering off;
      proxy_cache off;
      proxy_read_timeout 1h;
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # API + Swagger
    location /api/ {
      proxy_pass http://backend;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket (Socket.IO)
    location /socket.io/ {
      proxy_pass http://backend;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection $connection_upgrade;
      proxy_set_header Host $host;
      proxy_read_timeout 1h;
    }

    # Frontend SPA
    location / {
      proxy_pass http://frontend;
    }
  }
}
```

**Health endpoint** (backend): `GET /api/health` — используется для `depends_on.condition` в compose.

**Миграции и seed** выполняются entrypoint'ом backend-контейнера:

```bash
pnpm prisma migrate deploy && pnpm prisma db seed
```

`docker/init.sql` **не используется**. Единственный источник seed-данных — `prisma/seed.ts`
(идемпотентный, пароли хешируются bcryptjs). Это исключает расхождение compose и локального запуска.

**Backend runtime:** `node:20-alpine` + `apk add --no-cache openssl` (нужен Prisma engine);
в схеме — `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]`. `bcryptjs` не требует
build-tools, поэтому нативный `bcrypt` в образе не нужен.

**Redis** обязателен (см. [ADR-002](../decisions/adr-002-why-redis.md)):
Socket.IO Redis adapter для масштабирования на несколько инстансов backend.
Persistent-режим (`--appendonly yes`) включён.

---

## 2. CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm format:check
      - run: pnpm typecheck
      - run: pnpm test          # unit-тесты (без БД); integration — в job e2e
      - run: pnpm build

  e2e:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/min_trello
      DATABASE_URL_TEST: postgresql://postgres:postgres@localhost:5432/min_trello_test
      REDIS_URL: redis://localhost:6379
      JWT_SECRET: ci-secret-for-tests-only
      CORS_ORIGIN: http://localhost:5173
      VITE_API_URL: http://localhost:3000/api
      VITE_WS_URL: ws://localhost:3000
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: min_trello
          POSTGRES_PASSWORD: postgres
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready --health-interval 5s
          --health-timeout 5s --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
        options: >-
          --health-cmd "redis-cli ping" --health-interval 5s
          --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: PGPASSWORD=postgres createdb -h localhost -U postgres min_trello_test
      - run: pnpm db:deploy
      - run: DATABASE_URL=$DATABASE_URL_TEST pnpm db:deploy   # миграции тестовой БД
      - run: pnpm db:seed
      - run: pnpm --filter @min-trello/backend test:e2e   # supertest + DATABASE_URL_TEST
      - run: pnpm e2e

  images:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -f docker/backend.Dockerfile -t min-trello-backend .
      - run: docker build -f docker/frontend.Dockerfile -t min-trello-frontend --build-arg VITE_API_URL=/api .
```

**CD** (`.github/workflows/deploy.yml`, push в `main` после CI):
сборка Docker-образов → push в GHCR → на сервере `docker compose pull && docker compose up -d`.
Секреты (`DATABASE_URL`, `JWT_SECRET`, `SSH_*`) — через GitHub Secrets.

**Turbo tasks** (`turbo.json`, Turborepo v2):
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "lint": {},
    "format:check": {},
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["build"] }
  }
}
```

---

## 3. Переменные окружения

Валидация на старте через `packages/shared/src/env/schema.ts`.
**Схемы разделены по приложениям**: единый объект сломал бы старт FE (нет `DATABASE_URL`)
и BE (нет `VITE_*`).

```ts
import { z } from "zod";

// packages/shared/src/env/schema.ts
export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  DATABASE_URL_TEST: z.string().url().optional(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  REFRESH_GRACE_SECONDS: z.coerce.number().default(60),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  PORT: z.coerce.number().default(3000),
});

export const clientEnvSchema = z.object({
  // в prod — same-origin через edge nginx; в dev переопределяется в .env
  VITE_API_URL: z.string().default("/api"),
  // dev: ws://localhost:3000; prod: тот же origin, что и страница
  VITE_WS_URL: z.string().default("/"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
```

`DATABASE_URL_TEST` обязателен для `test:e2e` (интеграционные тесты чистой БД); `pnpm test`
(unit) БД не требует. `.env.example` коммитится, реальный `.env` — в `.gitignore`; compose
подставляет значения через `${VAR:-default}`, поэтому `.env` переопределяет дефолты:

```dotenv
# backend
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/min_trello
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/min_trello_test
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-to-a-long-random-string
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
REFRESH_GRACE_SECONDS=60
COOKIE_SECURE=false
CORS_ORIGIN=http://localhost:5173
PORT=3000

# frontend (dev; в prod используется same-origin /api через edge nginx)
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000
```

---

## 4. Dev-инструменты

| Инструмент | Команда | Описание |
|-----------|---------|----------|
| pnpm | `pnpm install` | Установка зависимостей |
| Turbo | `pnpm turbo build` | Параллельная сборка |
| ESLint | `pnpm lint` | Статический анализ |
| Prettier | `pnpm format` | Автоформатирование |
| commitlint | `pnpm commit` | Conventional commits |
| Dev | `pnpm dev` | FE + BE параллельно |
| Storybook | `pnpm storybook` | UI-компоненты изолированно |
| E2E | `pnpm e2e` | Playwright |
| Prisma | `pnpm db:generate` | Генерация клиента |
| Prisma | `pnpm db:migrate` | Миграции |
| Seed | `pnpm db:seed` | 2 предзаполненных пользователя |

> Vite в монорепе: задать `envDir: '..'` (корень) или дублировать `.env`, иначе `VITE_*`
> из корня не подхватятся. Socket.IO в dev использует `VITE_WS_URL`, в prod — same-origin `/`.

---

## Ссылки

- Монорепа: [02-monorepo.md](./02-monorepo.md)
- Env-схема в shared: `packages/shared/src/env/schema.ts`
- Health endpoint: [06-api.md](./06-api.md#health)
