# Min-Trello

Kanban-доска с JWT-авторизацией, drag-and-drop, live-обновлениями (Socket.IO + SSE) и REST API.

## Архитектура

Документация разбита по слоям (каждый файл самодостаточен, ссылается на соседние):

| Файл | О чём |
|------|-------|
| [01-overview](docs/architecture/01-overview.md) | Техстек, Dependency Inversion, SRP, цель архитектуры |
| [02-monorepo](docs/architecture/02-monorepo.md) | Структура репозитория, Turbo, pnpm |
| [03-frontend](docs/architecture/03-frontend.md) | Модули, экраны, флоу, data flow |
| [04-backend](docs/architecture/04-backend.md) | Модули NestJS, DI, репозитории |
| [05-database](docs/architecture/05-database.md) | Prisma-схема, связи, индексы |
| [06-api](docs/architecture/06-api.md) | REST, WebSocket, SSE |
| [07-infrastructure](docs/architecture/07-infrastructure.md) | Docker Compose, CI/CD, env, dev-инструменты |
| [08-testing](docs/architecture/08-testing.md) | Unit + E2E, мокинг через DI |

Пошаговый план: [docs/plan/README.md](docs/plan/README.md).

## Быстрый старт (одна команда)

Всё приложение (backend + frontend + БД, Redis внутри) поднимается одной командой:

```bash
docker compose up
```

Compose использует безопасные dev-дефолты из `docker-compose.yml`; `.env` опционален —
скопируйте `.env.example` в `.env`, если нужно переопределить переменные.

После старта: фронт — http://localhost, API — http://localhost/api, Swagger — http://localhost/api/docs.
Демо-доступы: `alice@example.com` / `password123`.

## Локальная разработка

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d   # Postgres + Redis
pnpm dev          # turbo: FE + BE параллельно
pnpm db:migrate   # Prisma миграции
pnpm db:seed      # предзаполненные пользователи
```

## Принятые решения

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
