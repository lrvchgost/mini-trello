# 07 — Инфраструктура

## Назначение

Docker Compose, CI/CD, переменные окружения, dev-инструменты.

---

## 1. Docker Compose

```yaml
# docker/docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - frontend
      - backend

  frontend:
    build:
      context: ..
      dockerfile: docker/frontend.Dockerfile
    environment:
      - VITE_API_URL=http://localhost/api
    depends_on:
      - backend

  backend:
    build:
      context: ..
      dockerfile: docker/backend.Dockerfile
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/min_trello
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=super-secret-key
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
      chunked_transfer_encoding off;
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
(идемпотентный, пароли хешируются bcrypt). Это исключает расхождение compose и локального запуска.

**Redis** обязателен (см. [ADR-002](../decisions/adr-002-why-redis.md)):
Socket.IO Redis adapter для масштабирования на несколько инстансов backend
и BullMQ для напоминаний о дедлайнах. Persistent-режим (`--appendonly yes`) включён.

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
      - run: pnpm test
      - run: pnpm build

  e2e:
    runs-on: ubuntu-latest
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
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/min_trello
      - run: pnpm prisma db seed
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/min_trello
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm e2e
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
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  PORT: z.coerce.number().default(3000),
});

export const clientEnvSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_WS_URL: z.string().url(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
```

`.env.example` коммитится, реальный `.env` — в `.gitignore`:

```dotenv
# backend
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/min_trello
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-to-a-long-random-string
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECURE=false
PORT=3000

# frontend
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

---

## Ссылки

- Монорепа: [02-monorepo.md](./02-monorepo.md)
- Env-схема в shared: `packages/shared/src/env/schema.ts`
- Health endpoint: [06-api.md](./06-api.md#health)
