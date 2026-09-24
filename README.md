# Min-Trello

Kanban-доска: React-спа с drag-and-drop, JWT-авторизацией, live-обновлениями (Socket.IO + SSE),
REST API и «тёмной» темой. Монорепа: NestJS + Prisma (backend), Vite + React (frontend),
общий пакет контрактов на zod.

## Требования

- **Docker** + **Docker Compose v2** — для запуска всего стека одной командой.
- **Node.js 20+** и **pnpm 9+** — только для локальной разработки и тестов (в Docker не нужны).
- **Google Chrome** — для Playwright E2E (`channel: chrome`).

Проверить версии:

```bash
docker --version
docker compose version
node --version
pnpm --version
```

## Быстрый старт (одна команда)

Из корня репозитория:

```bash
docker compose up
```

Первый запуск сам собирает образы, поднимает Postgres и Redis, применяет миграции
и идемпотентно засеивает демо-данные. Пересобрать образы после правок кода —
`docker compose up --build`. Дождитесь, пока все сервисы станут `healthy`
(`docker compose ps`), затем откройте:

- Приложение: http://localhost
- API: http://localhost/api
- Swagger: http://localhost/api/docs

Проверить готовность:

```bash
docker compose ps
curl -s localhost/api/health
curl -s -o /dev/null -w "%{http_code}\n" localhost/
curl -s -o /dev/null -w "%{http_code}\n" localhost/boards/demo
```

Остановить стек:

```bash
docker compose down
```

Остановить и удалить данные БД/Redis:

```bash
docker compose down -v
```

Сменить порт edge-nginx (по умолчанию `80`):

```bash
HTTP_PORT=8080 docker compose up
```

## Демо-доступы

Seed создаёт двух пользователей, у каждого 3 доски × 20 карточек:

| Email | Пароль |
|-------|--------|
| `alice@example.com` | `password123` |
| `bob@example.com` | `password123` |

## Локальная разработка

```bash
pnpm install
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d   # только Postgres + Redis
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Frontend (Vite): http://localhost:5173
- Backend (NestJS): http://localhost:3000
- Swagger: http://localhost:3000/api/docs

`pnpm dev` через Turbo запускает фронт и бэк параллельно. Для входа используйте демо-доступы
из раздела выше. Остановить инфраструктуру — `docker compose -f docker-compose.dev.yml down`.

Полезные команды БД:

```bash
pnpm db:generate   # prisma generate
pnpm db:migrate    # prisma migrate dev
pnpm db:deploy     # prisma migrate deploy
pnpm db:seed       # засеять демо-данные
pnpm db:reset      # сбросить БД и засеять заново
pnpm test:seed     # smoke-проверка seed
```

Если `5432` занят системным Postgres, задайте другой порт в `.env`
(`POSTGRES_PORT`) и поправьте `DATABASE_URL`/`DATABASE_URL_TEST` на тот же порт:

```bash
POSTGRES_PORT=5433 docker compose -f docker-compose.dev.yml up -d
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/min_trello
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5433/min_trello_test
```

## Тесты

Подготовить инфраструктуру и зависимости:

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d
```

Статические проверки и unit-тесты (БД не нужны):

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
```

Покрытие доменных сервисов backend (порог ≥ 80%):

```bash
pnpm test:cov
```

Интеграционные тесты backend (supertest + тестовая БД `DATABASE_URL_TEST`):

```bash
pnpm --filter @min-trello/backend test:e2e
```

E2E Playwright (сам поднимает backend `:3001` на тестовой БД и frontend `:5174`):

```bash
pnpm e2e
pnpm e2e:report   # открыть HTML-отчёт последнего прогона
```

Storybook UI-компонентов:

```bash
pnpm storybook
pnpm build-storybook
```

Сборка всего проекта:

```bash
pnpm build
```

## Переменные окружения

Все значения по умолчанию уже заданы в `docker-compose.yml`, поэтому для быстрого старта `.env`
не нужен. Для локальной разработки скопируйте шаблон и при необходимости поправьте значения:

```bash
cp .env.example .env
```

Основные переменные (backend):

| Переменная | Назначение | Пример |
|------------|------------|--------|
| `NODE_ENV` | Режим запуска | `development` |
| `DATABASE_URL` | Строка подключения Postgres | `postgresql://postgres:postgres@localhost:5433/min_trello` |
| `DATABASE_URL_TEST` | БД для интеграционных тестов | `postgresql://postgres:postgres@localhost:5433/min_trello_test` |
| `REDIS_URL` | Строка подключения Redis | `redis://localhost:6379` |
| `JWT_SECRET` | Секрет подписи JWT (≥ 16 символов) | `change-me-to-a-long-random-string` |
| `JWT_ACCESS_EXPIRES_IN` | Время жизни access-токена | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Время жизни refresh-токена | `7d` |
| `REFRESH_GRACE_SECONDS` | Окно grace-периода ротации refresh | `60` |
| `COOKIE_SECURE` | Отправлять refresh-cookie только по HTTPS | `false` |
| `CORS_ORIGIN` | Разрешённый origin фронта | `http://localhost:5173` |
| `PORT` | Порт backend | `3000` |

Переменные фронтенда (только dev; в production используется same-origin `/api` через edge nginx):

| Переменная | Назначение | Пример |
|------------|------------|--------|
| `VITE_API_URL` | Базовый URL API | `http://localhost:3000/api` |
| `VITE_WS_URL` | Базовый URL Socket.IO | `ws://localhost:3000` |

Переменные Docker-стека (опционально, префикс не пересекается с dev-`.env`):

| Переменная | Назначение |
|------------|------------|
| `HTTP_PORT` | Порт edge-nginx (по умолчанию `80`) |
| `MIN_TRELLO_DATABASE_URL` | `DATABASE_URL` внутри контейнеров |
| `MIN_TRELLO_REDIS_URL` | `REDIS_URL` внутри контейнеров |
| `MIN_TRELLO_CORS_ORIGIN` | `CORS_ORIGIN` backend-контейнера |
| `MIN_TRELLO_VITE_API_URL` / `MIN_TRELLO_VITE_WS_URL` | адреса, «запекаемые» в фронт при сборке |
| `MIN_TRELLO_BACKEND_IMAGE` / `MIN_TRELLO_FRONTEND_IMAGE` | образы из GHCR для `docker compose pull` |

## Структура проекта

```
min-trello/
├── apps/
│   ├── backend/                  # NestJS + Prisma (см. docs/architecture/04-backend.md)
│   │   ├── prisma/               # schema.prisma, миграции, seed.ts, seed.check.ts
│   │   ├── src/                  # модули: auth, users, boards, columns, cards,
│   │   │                         #   labels, comments, activity, search, dashboard,
│   │   │                         #   realtime, redis, prisma, common, config
│   │   └── test/                 # e2e-harness (supertest) и jest-e2e.json
│   └── frontend/                 # Vite + React (см. docs/architecture/03-frontend.md)
│       ├── src/
│       │   ├── app/              # провайдеры, роутер, layout, тема
│       │   ├── pages/            # login, register, dashboard, board, search, profile, 404
│       │   ├── widgets/          # board-column, card-modal, filter-bar, activity-log, stats-chart
│       │   ├── features/         # auth, boards, cards, labels, comments, filters, live
│       │   ├── entities/         # board, column, card, activity
│       │   └── shared/           # api, ui, realtime, hooks, config
│       └── e2e/                  # Playwright-сценарии
├── packages/
│   └── shared/                   # типы, zod-схемы, константы, env (FE + BE)
├── docker/
│   ├── backend.Dockerfile        # multi-stage build → non-root runtime
│   ├── backend-entrypoint.sh     # migrate deploy + db seed → node dist/main.js
│   ├── frontend.Dockerfile       # Vite build → nginx (SPA)
│   ├── frontend-nginx.conf       # SPA try_files для контейнера фронта
│   └── nginx.conf                # edge: SPA, /api, /socket.io, SSE
├── docker-compose.yml            # полный стек: `docker compose up`
├── docker-compose.dev.yml        # только Postgres + Redis для разработки
├── .github/workflows/            # ci.yml, deploy.yml
├── docs/                         # architecture, decisions (ADR), plan, rules, progress
├── turbo.json                    # задачи Turbo
└── package.json                  # корневые скрипты
```

## Архитектура и решения

Документация разбита по слоям (каждый файл самодостаточен):

| Файл | О чём |
|------|-------|
| [01-overview](docs/architecture/01-overview.md) | Техстек, Dependency Inversion, SRP |
| [02-monorepo](docs/architecture/02-monorepo.md) | Структура репозитория, Turbo, pnpm |
| [03-frontend](docs/architecture/03-frontend.md) | Модули, экраны, флоу, data flow |
| [04-backend](docs/architecture/04-backend.md) | Модули NestJS, DI, репозитории |
| [05-database](docs/architecture/05-database.md) | Prisma-схема, связи, индексы |
| [06-api](docs/architecture/06-api.md) | REST, WebSocket, SSE |
| [07-infrastructure](docs/architecture/07-infrastructure.md) | Docker Compose, CI/CD, env |
| [08-testing](docs/architecture/08-testing.md) | Unit + E2E, мокинг через DI |

Пошаговый план: [docs/plan/README.md](docs/plan/README.md). Все ключевые решения
зафиксированы в [ADR](docs/decisions/README.md), кратко:

| Решение | Альтернатива | Почему выбрано |
|---------|-------------|----------------|
| JWT (passport) | Keycloak | Легче, 2 пользователя, без отдельного IdP |
| bcryptjs | bcrypt / argon2 | Pure JS, без node-gyp — собирается на Alpine |
| Prisma | TypeORM | Типобезопасность, миграции, хороший DX |
| Socket.IO | ws | Fallback-транспорты, комнаты, меньше кода |
| ky | axios | Легче, fetch-based, типизированный |
| @hello-pangea/dnd | dnd-kit | Форк react-beautiful-dnd, поддерживается |
| MDXEditor | rich-markdown-editor | rich-markdown-editor не поддерживается (React 18) |
| Recharts | Chart.js | React-friendly, декларативный, `ResponsiveContainer` |
| winston | pino | Привычнее команде (опционально: Pino быстрее) |
| Ownership-only, assignee = владелец | board members | Нет требования на коллаборацию — проще guard и схема ([ADR-008](docs/decisions/adr-008-ownership-only-access.md)) |
