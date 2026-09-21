# Фаза 0 — Фундамент

Результат фазы: монорепо собирается, линтуется, типизируется; есть shared-пакет;
поднимаются Postgres и Redis. Кода приложений ещё нет.

---

## Шаг 0.1 — Монорепо и инструменты

**Цель:** рабочий скелет Turborepo + pnpm workspaces с линтом, форматом и хуками.

**Артефакты:**
- `package.json` (корень), `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`
- `.eslintrc.cjs`, `.prettierrc`, `.prettierignore`, `.commitlintrc.cjs`
- `.husky/pre-commit`, `.husky/commit-msg`
- `.gitignore`, `.env.example`
- `docs/progress.md`

**Зависимости:** нет.

**Definition of Ready:** установлены Node 20+, pnpm 9+, git-репозиторий инициализирован.

**Действия:**
1. `pnpm init`; задать `private: true`, `packageManager: "pnpm@9"`.
2. `pnpm-workspace.yaml`: `packages: ['apps/*', 'packages/*']`.
3. Корневые скрипты: `dev`, `build`, `lint`, `format`, `format:check`, `typecheck`,
   `test`, `test:e2e`, `test:cov`, `e2e`, `commit`. Скрипты `db:migrate`/`db:deploy`/`db:seed`/`db:reset`
   добавляются в `1.2` (нужен Prisma; до этого падают).
4. `turbo.json` (v2): задачи `build` (`dependsOn ["^build"]`, `outputs ["dist/**"]`),
   `lint`, `format:check`, `typecheck` (`dependsOn ["^build"]`), `test` (`dependsOn ["build"]`).
5. `tsconfig.base.json`: `strict`, `target ES2022`, paths для `@min-trello/shared`. **Резолюция
   модулей задаётся в приложениях:** frontend — `moduleResolution: bundler`, backend —
   `module: commonjs`, `moduleResolution: node` (`bundler` для NestJS несовместим).
6. ESLint + Prettier (общие конфиги, без дублей в apps), `.prettierignore`.
7. commitlint + husky: `pre-commit` → `lint-staged` (`eslint --fix`, `prettier --write`),
   `commit-msg` → `commitlint`.
8. `.env.example` (сервер + клиент переменные), `.env` в `.gitignore`.
9. Создать `docs/progress.md` с шапкой таблицы.

**Тесты:** нет (инфраструктурный шаг).

**Команда проверки:**
```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm format:check
git commit -m "bad message"   # должен упасть
```

**Ожидаемый результат (DoD):**
- `pnpm install` проходит; `lint`, `typecheck`, `format:check` без ошибок.
- Коммит с неконвенциональным сообщением отклоняется commitlint.
- В корне нет кода приложений, только конфиги.

**Откат:** `git reset --hard <prev>` (изменения только в конфигах).

**Продолжение после паузы:**
```bash
pnpm install && pnpm lint && pnpm typecheck
```
Если проходит — шаг закрыт, можно идти к 0.2.

**Оценка:** 0.5 дня.
**Commit:** `chore(repo): bootstrap turborepo + pnpm workspaces`

---

## Шаг 0.2 — Shared-пакет

**Цель:** единый источник контрактов — zod-схемы, типы, env.

**Артефакты:**
- `packages/shared/package.json` (`@min-trello/shared`), `tsconfig.json`
- `packages/shared/src/index.ts`
- `packages/shared/src/env/schema.ts` (serverEnvSchema, clientEnvSchema)
- `packages/shared/src/env/parse.ts` (parseServerEnv/parseClientEnv)
- `packages/shared/src/schemas/{auth,user,board,column,card,label,comment,activity,common}.ts`
- `packages/shared/src/types/*.ts` (выводятся через `z.infer`)
- `packages/shared/src/constants.ts` (Priority, лимиты пагинации, коды ошибок)
- сборка (`tsup` или `tsc`) + `exports`

**Зависимости:** 0.1.

**Definition of Ready:** 0.1 в статусе `done`.

**Действия:**
1. Настроить сборку dual (esm/cjs) и `exports` map. Зафиксировать `zod` v3 (совместимость с
   `nestjs-zod`); при необходимости — общий `common.ts` (пагинация, коды ошибок).
2. `serverEnvSchema` / `clientEnvSchema` (раздельно; см. 07-infrastructure.md).
3. `parseServerEnv()`/`parseClientEnv()` — `safeParse`, при ошибке бросать с деталями zod.
4. Схемы (Create/Update/Response) для: auth, user, board, column (вкл. `isDone`), card, label, comment, activity.
   Пример ключевой:
   ```ts
   export const prioritySchema = z.enum(['low','medium','high','urgent']);

   export const createCardSchema = z.object({
     title: z.string().min(1).max(200),
     description: z.string().max(20_000).optional(),
     priority: prioritySchema.default('medium'),
     deadline: z.coerce.date().nullable().optional(),
   });

   export const updateCardSchema = z.object({
     title: z.string().min(1).max(200).optional(),
     description: z.string().max(20_000).nullable().optional(),
     priority: prioritySchema.optional(),
     deadline: z.coerce.date().nullable().optional(),
     expectedUpdatedAt: z.coerce.date().optional(),   // optimistic locking -> 409
   });

   export const moveCardSchema = z.object({
     columnId: z.string().cuid(),
     order: z.number().int().min(0),
   });

   export const paginated = <T extends z.ZodTypeAny>(item: T) =>
     z.object({ items: z.array(item), total: z.number().int(), page: z.number().int(), limit: z.number().int() });
   ```
5. Типы: `export type Card = z.infer<typeof cardSchema>` и т.п.
6. Подключить shared как зависимость в `apps/backend`, `apps/frontend`.

**Тесты:** unit (Vitest) — валидные/невалидные данные каждой схемы; `parseServerEnv` на неполном env.

**Команда проверки:**
```bash
pnpm --filter @min-trello/shared build
pnpm --filter @min-trello/shared test
```

**Ожидаемый результат (DoD):**
- Собран `dist`, экспортируются схемы и типы.
- Тесты схем зелёные; `parseServerEnv({})` бросает с перечнем полей.

**Откат:** revert коммита; удалить пакет из workspace.

**Продолжение после паузы:** `pnpm --filter @min-trello/shared build && pnpm --filter @min-trello/shared test`.

**Оценка:** 1 день.
**Commit:** `feat(shared): zod contracts, types and env parsing`

---

## Шаг 0.3 — Инфраструктура разработки

**Цель:** локальные Postgres и Redis одной командой.

**Артефакты:**
- `docker-compose.dev.yml` (postgres:16, redis:7, volumes, healthchecks)

**Зависимости:** 0.1.

**Definition of Ready:** установлен Docker.

**Действия:**
1. `docker-compose.dev.yml` (корень): сервисы `db` (порт 5432, `POSTGRES_DB=min_trello`) и `redis` (6379).
2. Healthcheck: `pg_isready -U postgres -d min_trello`; `redis-cli ping`.
3. Определить `DATABASE_URL` и `REDIS_URL` в `.env`.

**Тесты:** нет.

**Команда проверки:**
```bash
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
docker exec $(docker compose -f docker-compose.dev.yml ps -q db) pg_isready -U postgres -d min_trello
docker exec $(docker compose -f docker-compose.dev.yml ps -q redis) redis-cli ping
```

**Ожидаемый результат (DoD):** оба контейнера `healthy`; `pg_isready` → accepting connections; `redis-cli ping` → `PONG`.

**Откат:** `docker compose -f docker-compose.dev.yml down -v`.

**Продолжение после паузы:** повторить команды проверки; при необходимости `up -d` заново.

**Оценка:** 0.5 дня.
**Commit:** `chore(infra): local postgres and redis via docker compose`
