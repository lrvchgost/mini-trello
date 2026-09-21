# План разработки min-trello

Пошаговый, останавливаемый и возобновляемый план. Основан на `docs/architecture/*.md`,
`docs/decisions/*.md` и правилах `docs/rules/step-rules.md`.

## Как пользоваться

1. Перед стартом шага проверь **Definition of Ready** (зависимости закрыты).
2. Выполни шаг по разделу «Действия».
3. Прогони **«Команду проверки»** и сверь с **«Ожидаемым результатом»**.
4. Зафиксируй шаг в `docs/progress.md` (см. шаблон ниже) и закоммить.
5. Если шаг не проходит проверку — не начинай следующий; откати или почини.

## Возобновление после паузы

В любой момент:

```bash
git switch <ветка-шага>        # или main
pnpm install
docker compose -f docker-compose.dev.yml up -d   # доступно после шага 0.3
pnpm --filter @min-trello/shared build
pnpm lint && pnpm typecheck && pnpm test
```

Затем открой `docs/progress.md`: последняя запись со статусом `done` — точка возобновления.
Следующий шаг — первый со статусом `todo`, чьи зависимости отмечены `done`.

## Шаблон шага

Каждый шаг описан так:

- **Цель** — зачем шаг.
- **Артефакты** — какие файлы/миграции/ADR появляются.
- **Зависимости** — какие шаги должны быть закрыты.
- **Definition of Ready** — проверка перед началом.
- **Действия** — что именно сделать.
- **Тесты** — что и где тестируется.
- **Команда проверки** — команды (backend/frontend/infra).
- **Ожидаемый результат (DoD)** — что считается успехом.
- **Откат** — как отменить.
- **Продолжение после паузы** — как убедиться, что состояние корректно.
- **Оценка** — ориентир.
- **Commit** — тип и scope по Conventional Commits.

## Шаблон записи в `docs/progress.md`

```markdown
| Дата       | Шаг | Что сделано | Как проверить | Commit | Статус |
|------------|-----|-------------|---------------|--------|--------|
| 2026-09-21 | 0.1 | Монорепо, turbo, lint | `pnpm lint && pnpm typecheck` | abc1234 | done |
```

Статусы: `todo` / `in_progress` / `done` / `blocked`.

## Фазы

| Фаза | Файл | Шаги |
|------|------|------|
| 0. Фундамент | [00-foundation.md](./00-foundation.md) | 0.1–0.3 |
| 1. Backend core | [01-backend-core.md](./01-backend-core.md) | 1.1–1.4 |
| 2. Backend домен | [02-backend-domain.md](./02-backend-domain.md) | 2.1–2.7 |
| 3. Realtime | [03-realtime.md](./03-realtime.md) | 3.1 |
| 4. Seed | [04-seed.md](./04-seed.md) | 4.1 |
| 5. Frontend | [05-frontend.md](./05-frontend.md) | 5.1–5.11 |
| 6. Тесты | [06-testing.md](./06-testing.md) | 6.1–6.3 |
| 7. Deploy | [07-deploy.md](./07-deploy.md) | 7.1–7.3 |

## Граф зависимостей

```
0.1 ─> 0.2 ─> 1.1 ─> 1.2 ─> 1.3 ─> 1.4
0.1 ─> 0.3 ─────────┘
1.2 ─> 2.1 ─> 2.2 ─> 2.3
2.1 ─> 2.4   (2.4 также требует 2.3)
2.3 ─> 2.5
0.3,2.1,2.3,2.5 ─> 2.6
2.3 ─> 2.7
0.3,2.2,2.3,2.5 ─> 3.1 ─> 5.9
1.2 ─> 4.1
0.2,1.3 ─> 5.1 ─> 5.2 ─> 5.3..5.11
2.7 ─> 5.4 / 5.8
(2.x,3.1,4.1,5.x) ─> 6.1..6.3 ─> 7.1..7.3
```

Матрица полноты требований: [traceability.md](./traceability.md).

## Имена пакетов

| Пакет | Имя (для `pnpm --filter`) |
|-------|---------------------------|
| `apps/backend` | `@min-trello/backend` |
| `apps/frontend` | `@min-trello/frontend` |
| `packages/shared` | `@min-trello/shared` |

## Ограничения окружения (для «готовности к выполнению»)

- Node 20+, pnpm 9+.
- Docker + Docker Compose.
- Порты: backend `3000`, frontend `5173`, Postgres `5432`, Redis `6379`, edge nginx `80`.

## Глобальные команды (корень)

| Команда | Назначение |
|---------|-----------|
| `pnpm dev` | FE + BE (turbo) |
| `pnpm build` | Сборка всех пакетов |
| `pnpm lint` / `pnpm format` | ESLint / Prettier |
| `pnpm typecheck` | Типы |
| `pnpm test` | Unit (Jest + Vitest) |
| `pnpm e2e` | Playwright |
| `pnpm db:migrate` | Prisma migrate dev |
| `pnpm db:deploy` | Prisma migrate deploy |
| `pnpm db:seed` / `pnpm db:reset` | Seed / сброс+seed |
