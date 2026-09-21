# Фаза 1 — Backend core

Результат фазы: NestJS-приложение с health/Swagger/логами, Prisma, аутентификацией и users.
Каждый шаг проверяется через `curl`/supertest без фронтенда.

Общая проверка фазы после каждого шага:
```bash
pnpm --filter @min-trello/backend test       # unit (без БД)
pnpm --filter @min-trello/backend test:e2e   # integration (test-БД, см. 1.2)
pnpm --filter @min-trello/backend dev        # отдельный терминал
```

---

## Шаг 1.1 — Bootstrap NestJS

**Цель:** запускаемый сервер с cross-cutting-механизмами и живой документацией.

**Артефакты:**
- `apps/backend/package.json`, `tsconfig.json`, `nest-cli.json`
- `src/main.ts`, `src/app.module.ts`
- `src/common/filters/all-exceptions.filter.ts` (формат `ApiError`)
- `src/common/pipes/zod-validation.pipe.ts`
- подключение `nestjs-zod` (единый патч для validation + Swagger из zod)
- `src/common/interceptors/logging.interceptor.ts` (winston)
- `src/common/health/*` (terminus)
- `src/common/errors.ts` (коды ошибок из shared)
- `src/config/*` (обёртка над `parseServerEnv`)

**Зависимости:** 0.2, 0.3.

**Definition of Ready:** shared собран; db/redis подняты.

**Действия:**
1. `nest new`-структура; подключить `@min-trello/shared`.
2. Валидация env на старте через `parseServerEnv` (падение при отсутствии переменных).
3. Глобально: `AllExceptionsFilter`, `LoggingInterceptor`, `ValidationPipe` (zod), префикс `api`.
4. `helmet`, CORS (`origin` из env), `@nestjs/throttler`.
5. Swagger: `DocumentBuilder`, `/api/docs`; DTO из zod через `nestjs-zod` (живые схемы, не ручные декораторы).
6. Health: `@nestjs/terminus` → `GET /api/health` (базовая проверка; индикатор БД добавляется в 1.2).
7. Winston-логгер + `LoggingInterceptor`.

**Тесты:** integration (supertest) — `/api/health` 200, `/api/docs` 200, неизвестный роут → 404 в формате `ApiError`.

**Команда проверки:**
```bash
pnpm --filter @min-trello/backend test
pnpm --filter @min-trello/backend dev
curl -s localhost:3000/api/health
curl -s -o /dev/null -w "%{http_code}" localhost:3000/api/docs
```

**Ожидаемый результат (DoD):**
- `/api/health` → `{ status: 'ok', ... }` (индикатор `db` появится в 1.2).
- `/api/docs` → 200; тесты зелёные; логи структурированы (JSON).

**Откат:** revert коммита; шаг изолирован.

**Продолжение после паузы:** `pnpm --filter @min-trello/backend dev` + `curl /api/health`.

**Оценка:** 1 день.
**Commit:** `feat(backend): bootstrap nest with health, swagger and logging`

---

## Шаг 1.2 — Prisma и репозитории

**Цель:** схема БД, миграции, DI-слой доступа к данным.

**Артефакты:**
- `apps/backend/prisma/schema.prisma` — **по `05-database.md`** (User, Board, Column, Card, Label, CardLabel, Comment, ActivityLog, RefreshToken)
- `prisma/migrations/*`
- `src/prisma/prisma.module.ts`, `src/prisma/prisma.service.ts`
- `src/prisma/repositories.module.ts` — `@Global()`: единая регистрация `*_REPOSITORY_TOKEN` (биндинги добавляются по шагам)
- `apps/backend/test/{setup.ts,jest-e2e.json}` — интеграционный harness на `DATABASE_URL_TEST`
- Интерфейсы + токены репозиториев: `*/repositories/*.repository.ts`

**Зависимости:** 1.1.

**Definition of Ready:** 1.1 `done`; db доступна.

**Действия:**
1. Перенести схему из `05-database.md` без изменений (enum Priority, индексы, каскады).
2. `prisma migrate dev --name init`; `prisma generate`.
3. `PrismaService` (`onModuleInit` connect, `enableShutdownHooks`).
4. Объявить интерфейсы репозиториев и токены и создать пустой `@Global() RepositoriesModule`;
   `AppModule` импортирует `PrismaModule` + `RepositoriesModule`. Имплементации и их биндинги
   добавляются в шагах 1.3/1.4/2.x.
5. Скрипты `db:migrate/dev/deploy/generate` в `apps/backend/package.json`.
6. Добавить в `/api/health` индикатор БД (`PrismaHealthIndicator`).

**Тесты:** unit — пример сервиса с мок-репозиторием (DI работает); integration (`test:e2e`) —
сессия на `DATABASE_URL_TEST`: миграции применяются, таблицы очищаются между тестами.

**Команда проверки:**
```bash
pnpm db:deploy
pnpm --filter @min-trello/backend exec prisma studio   # визуально: таблицы есть
pnpm --filter @min-trello/backend test
pnpm --filter @min-trello/backend test:e2e
```

**Ожидаемый результат (DoD):**
- Миграция `init` применена; таблицы/enum/индексы соответствуют 05.
- `/api/health` → `{ status: 'ok', db: 'up' }`.
- Репозиторий подменяется моком в тесте без Prisma.

**Откат:** forward-fix миграцией; для чистого отката — `prisma migrate reset` (только dev).

**Продолжение после паузы:** `pnpm db:deploy && pnpm --filter @min-trello/backend exec prisma migrate status`.

**Оценка:** 1 день.
**Commit:** `feat(backend): prisma schema, migrations and repository contracts`

---

## Шаг 1.3 — Auth (JWT + refresh)

**Цель:** регистрация, логин, refresh, logout; защита роутов.

**Артефакты:**
- `src/auth/*` (module/controller/service/dto), `strategies/jwt.strategy.ts`, `local.strategy.ts`
- `src/common/guards/jwt-auth.guard.ts`, `decorators/current-user.decorator.ts`
- `src/auth/repositories/{refresh-token.repository.ts, prisma-refresh-token.repository.ts}`
- cookie-настройки (`httpOnly`, `SameSite=Lax`, `Path=/api/auth`)

**Зависимости:** 1.2.

**Definition of Ready:** 1.2 `done`; есть shared auth-схемы.

**Действия:**
1. `POST /api/auth/register` — bcryptjs-хеш, `create` по уникальному email; конфликт (`P2002`) →
   `409 EMAIL_TAKEN` (без `upsert` — иначе повторная регистрация перезапишет пароль).
   Выдача access + refresh-cookie (как в login), чтобы сессия переживала перезагрузку.
2. `POST /api/auth/login` — проверка пароля, выдача access (15m) + refresh (7d) cookie.
3. `POST /api/auth/refresh` — ротация refresh (старый revoke, новый hash), новый access в теле.
   В коротком grace-окне повтор тем же токеном возвращает уже выданную пару (идемпотентность),
   иначе параллельные refresh из вкладок разлогинивают.
4. `POST /api/auth/logout` — revoke + очистка cookie.
5. `GET /api/auth/me`.
6. `JwtAuthGuard` глобально (кроме `@Public()`), `@CurrentUser()`.
7. Хранение refresh: SHA-256 от токена в `RefreshToken`.
8. Очистка просроченных/отозванных `RefreshToken` (при логине и/или периодически), чтобы таблица не росла.
9. Зарегистрировать `REFRESH_TOKEN_REPOSITORY_TOKEN` → `PrismaRefreshTokenRepository` в `RepositoriesModule`.

**Тесты:**
- Unit: `AuthService` (успех, неверный пароль, дубль email, ротация, revoke).
- Integration: полный цикл register→refresh (без login)→refresh→logout; запрос без токена → 401.

**Команда проверки:**
```bash
pnpm --filter @min-trello/backend test
pnpm --filter @min-trello/backend test:e2e
curl -s -c /tmp/c -X POST localhost:3000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"a@b.c","name":"A","password":"password123"}'   # 201 + refresh-cookie
curl -s -b /tmp/c -c /tmp/c -X POST localhost:3000/api/auth/refresh   # 200 без login
curl -s -c /tmp/c -X POST localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"a@b.c","password":"password123"}'
curl -s -b /tmp/c -X POST localhost:3000/api/auth/refresh
curl -s -o /dev/null -w "%{http_code}" localhost:3000/api/auth/me   # 401 без access-токена
```

**Ожидаемый результат (DoD):** цикл проходит; `401` без токена; refresh не переиспользуется.

**Откат:** revert коммита + `prisma migrate` при откате таблицы (forward-fix).

**Продолжение после паузы:** повторить curl-цикл; `pnpm --filter @min-trello/backend exec prisma migrate status`.

**Оценка:** 1.5 дня.
**Commit:** `feat(auth): jwt access/refresh with rotation and logout`

---

## Шаг 1.4 — Users

**Цель:** текущий пользователь для assignee и управление профилем.

**Артефакты:** `src/users/{module,controller,service}.ts`, `dto/`, `users/repositories/*`.

**Зависимости:** 1.3.

**Definition of Ready:** 1.3 `done`.

**Действия:**
1. `GET /api/users` — текущий пользователь (ownership: assignee = владелец доски),
   id/name/email без password, под `JwtAuthGuard`.
2. `PATCH /api/users/me` — смена `name`.
3. `PATCH /api/users/me/password` — проверка старого, bcryptjs-хеш нового, revoke всех refresh.
4. Не отдавать `password`/`tokenHash` нигде (select-маскировка).
5. Зарегистрировать `USER_REPOSITORY_TOKEN` → `PrismaUserRepository` в `RepositoriesModule`.

**Тесты:** Unit (смена пароля, revoke), Integration (401 без токена, отсутствие password в ответе).

**Команда проверки:**
```bash
pnpm --filter @min-trello/backend test
pnpm --filter @min-trello/backend test:e2e
curl -s -b /tmp/c localhost:3000/api/users
curl -s -b /tmp/c -X PATCH localhost:3000/api/users/me -H 'Content-Type: application/json' -d '{"name":"New"}'
```

**Ожидаемый результат (DoD):** ответ без поля `password`; имя меняется; после смены пароля старый refresh невалиден.

**Откат:** revert коммита.
**Продолжение после паузы:** `pnpm --filter @min-trello/backend test && curl /api/users`.
**Оценка:** 0.5 дня.
**Commit:** `feat(users): list users and profile/password management`
