# 02 — Монорепа (Turborepo + pnpm)

## Назначение

Единый репозиторий для фронтенда, бэкенда и shared-пакета.
Переиспользование типов и zod-схем между клиентом и сервером.

## Структура

```
min-trello/
├── apps/
│   ├── frontend/          # Vite + React (см. 03-frontend.md)
│   └── backend/           # NestJS (см. 04-backend.md)
├── packages/
│   └── shared/            # Типы, zod-схемы, константы, env
│       └── src/
│           ├── env/schema.ts
│           ├── schemas/ (auth, board, column, card, comment)
│           ├── types/ (user, board, column, card, comment, activity)
│           ├── constants.ts
│           └── index.ts
├── docker/
│   ├── frontend.Dockerfile
│   ├── backend.Dockerfile
│   ├── nginx.conf
│   └── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml        # Определяет apps/* и packages/*
├── package.json               # Корневой: lint, format, typecheck
├── .eslintrc.js               # Единый линтер для всего проекта
├── .prettierrc                # Единый форматер
├── .commitlintrc.js           # Conventional commits
├── .github/workflows/ci.yml       # CI (см. 07-infrastructure.md)
├── .github/workflows/deploy.yml   # CD
└── README.md
```

## Как это работает

- **pnpm-workspace.yaml** — подключает `apps/*` и `packages/*`
- **turbo.json** — tasks: `build` → `test`, параллельный запуск линтеров
- **packages/shared** — зависит от `zod`, импортируется и в FE, и в BE
- **@nestjs/axios** и **ky** не пересекаются — каждый в своём `apps/`

## Запуск

```bash
pnpm install          # установить всё
pnpm dev              # turbo: FE + BE параллельно
pnpm lint             # проверить линтинг везде
pnpm test             # запустить тесты во всех apps
pnpm build            # собрать всё
```

## Контекст

Shared-пакет: `packages/shared` (типы, zod-схемы, константы, env).  
Docker-сборка: [07-infrastructure.md](./07-infrastructure.md)
