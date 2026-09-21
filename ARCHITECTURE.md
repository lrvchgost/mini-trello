# Min-Trello: Архитектура проекта

> **Архитектура разбита на независимые документы в `docs/architecture/`**

| Документ | Описание |
|----------|----------|
| [01-overview](docs/architecture/01-overview.md) | Техстек, DI, SRP |
| [02-monorepo](docs/architecture/02-monorepo.md) | Структура turbo/pnpm |
| [03-frontend](docs/architecture/03-frontend.md) | Модули, экраны, data flow |
| [04-backend](docs/architecture/04-backend.md) | Модули NestJS, DI, репозитории |
| [05-database](docs/architecture/05-database.md) | Prisma-схема |
| [06-api](docs/architecture/06-api.md) | REST, WebSocket, SSE |
| [07-infrastructure](docs/architecture/07-infrastructure.md) | Docker, CI/CD, env |
| [08-testing](docs/architecture/08-testing.md) | Юнит + E2E, DI-мокинг |

> **Все решения фиксируются в [ADR](docs/decisions/README.md):**
> [001 JWT](docs/decisions/adr-001-why-jwt-not-keycloak.md) ·
> [002 Redis](docs/decisions/adr-002-why-redis.md) ·
> [003 MDXEditor](docs/decisions/adr-003-markdown-editor.md) ·
> [004 Auth-токены](docs/decisions/adr-004-auth-tokens.md) ·
> [005 Socket.IO + SSE](docs/decisions/adr-005-realtime-sse-and-websocket.md) ·
> [006 DnD](docs/decisions/adr-006-dnd-library.md) ·
> [007 Recharts](docs/decisions/adr-007-charts-library.md).
