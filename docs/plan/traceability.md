# Матрица полноты: требование → шаг → проверка

Источники требований: `results/1-research-prompts.md` (ТЗ),
`results/2-create-dev-plan-prompts.md` (нефункциональные), `docs/rules/step-rules.md` (процесс).

Статусы: ✅ покрыто · ⚠️ частично · ❌ не покрыто · ➖ снято.

## Базовые (функциональные)

| # | Требование | Источник | Шаг(и) | Проверка | Статус |
|---|-----------|----------|--------|----------|--------|
| B1 | CRUD с валидацией клиент+сервер | 1-research | 1.1, 2.1–2.5, 5.3–5.6 | supertest + Vitest, zod-pipe | ✅ |
| B2 | Поиск и фильтрация по ключевым полям | 1-research | 2.7, 5.8 | integration (search) | ✅ |
| B3 | Дашборд с графиками/статистикой | 1-research | 2.7, 5.4 | unit stats + smoke | ✅ |
| B4 | Пагинация списков | 1-research | 2.1, 2.5, 2.6, 2.7, 5.4 | `Paginated<T>` в тестах (кроме `/api/users` — там только текущий пользователь) | ✅ |
| B5 | Адаптивная вёрстка desktop+mobile | 1-research | 5.11 | smoke 375px / ≥1024px | ✅ |
| B6 | REST + OpenAPI/Swagger (живая страница) | 1-research | 1.1 | `GET /api/docs` → 200 | ✅ |

## Функциональные

| # | Требование | Источник | Шаг(и) | Проверка | Статус |
|---|-----------|----------|--------|----------|--------|
| F1 | Регистрация/авторизация (JWT), 2 предзаполненных юзера | 1-research | 1.3, 4.1 | auth integration + seed count | ✅ |
| F2 | Доски, доска = набор колонок | 1-research | 2.1, 2.2 | integration | ✅ |
| F3 | Колонки с настраиваемыми названиями | 1-research | 2.2, 5.5 | integration + smoke | ✅ |
| F4 | Карточки: заголовок, Markdown, приоритет, дедлайн, метки | 1-research | 2.3, 2.4, 5.6 | unit + integration | ✅ |
| F5 | DnD между колонками и внутри | 1-research | 2.3, 5.7 | unit reorder + E2E | ✅ |
| F6 | Комментарии с timestamp и автором | 1-research | 2.5, 5.6 | integration | ✅ |
| F7 | Фильтры: приоритет/метки/исполнитель/дедлайн | 1-research | 2.7, 5.8 | integration | ✅ |
| F8 | Лог активности (кто/когда/что) | 1-research | 2.6, 5.9 | integration SSE | ✅ |
| F9 | Назначение карточки (assignee) | 1-research | 2.3, 1.4, 5.6 | integration (assignee = владелец, ADR-008) | ✅ |
| F10 | Live-обновления доски | 1-research | 3.1, 5.9 | integration 2 клиента + smoke | ✅ |
| F11 | Доски закреплены за пользователем, досок много | 1-research | 2.1 | ownership integration | ✅ |

## Frontend

| # | Требование | Шаг(и) | Проверка | Статус |
|---|-----------|--------|----------|--------|
| FE1 | UI kit | 5.2 | Storybook build | ✅ |
| FE2 | Модульная структура | 5.1 | структура `03-frontend.md` | ✅ |
| FE3 | Сетевой клиент ky | 5.1 | unit интерцептор | ✅ |
| FE4 | Unit-тесты | 6.2 | `vitest` | ✅ |
| FE5 | DnD-библиотека | 5.7 | unit + E2E | ✅ |
| FE6 | Роутинг + state-менеджмент | 5.1 | protected routes smoke | ✅ |
| FE7 | Набор экранов | 5.3–5.10 | smoke | ✅ |
| FE8 | Флоу переключения | 5.1, 5.5 | redirect/навигация | ✅ |
| FE9 | Сборщик (Vite) | 5.1 | build | ✅ |
| FE10 | Линтеры/форматеры/commitlint | 0.1 | `lint`/`format:check` | ✅ |
| FE11 | Docker Compose (Nginx → фронт) | 7.1 | `docker compose up` + SPA deep-link | ✅ |
| FE12 | Markdown редактор + рендерер | 5.6 | unit + XSS-кейс | ✅ |
| FE13 | E2E Playwright | 6.3 | `pnpm e2e` | ✅ |

## Backend

| # | Требование | Шаг(и) | Проверка | Статус |
|---|-----------|--------|----------|--------|
| BE1 | Live: WS + SSE | 2.6, 3.1 | integration | ✅ |
| BE2 | Модульная структура | 1.1–2.7 | `04-backend.md` | ✅ |
| BE3 | NestJS | 1.1 | dev + health | ✅ |
| BE4 | Схема БД | 1.2 | `migrate` + studio | ✅ |
| BE5 | @nestjs/axios | — | — | ➖ снято из стека, см. G1 |
| BE6 | Unit-тесты | 6.1, по шагам | Jest + coverage | ✅ |
| BE7 | ORM Prisma | 1.2 | миграции | ✅ |
| BE8 | CI/CD | 7.2 | Actions | ✅ |
| BE9 | Контракты API | 0.2, 1.1 | shared zod + Swagger | ✅ |
| BE10 | Compose: Nginx → backend + Postgres + Redis | 7.1 | `docker compose up` | ✅ |
| BE11 | bcryptjs | 1.3 | auth integration | ✅ |
| BE12 | Rate limiting (@nestjs/throttler) | 1.1 | unit/smoke | ✅ |
| BE13 | Health endpoint | 1.1, 1.2 | `/api/health` | ✅ |
| BE14 | Swagger | 1.1 | `/api/docs` | ✅ |
| BE15 | Helmet + CORS | 1.1 | smoke | ✅ |
| BE16 | Логирование winston | 1.1 | JSON-логи | ✅ |

## Общее и технологии

| # | Требование | Шаг(и) | Проверка | Статус |
|---|-----------|--------|----------|--------|
| C1 | Env в `packages/shared` | 0.2 | unit parseEnv | ✅ |
| C2 | Shared: типы, zod, константы | 0.2 | build + test | ✅ |
| T1 | TS FE/BE, React, Postgres, Docker, passport, Socket.IO | 0.1–7.3 | по шагам | ✅ |

## Нефункциональные

| # | Требование | Источник | Шаг(и) | Проверка | Статус |
|---|-----------|----------|--------|----------|--------|
| N1 | Реалистичный seed (2 юзера × 3 доски × 20 задач) | 2-create-dev-plan | 4.1 | `test:seed` → 2/6/120 | ✅ |
| N2 | CI: lint + тесты (+ сборка образов) | 2-create-dev-plan | 7.2 | Actions зелёный | ✅ |
| N3 | Одна команда `docker compose up` | 2-create-dev-plan | 7.1 | smoke из корня | ✅ |
| N4 | README (markdown) с инструкцией | 2-create-dev-plan | 7.3 | воспроизведение | ✅ |
| N5 | Пошаговость: DoD, тесты, история, откат | step-rules | все шаги | `docs/progress.md` | ✅ |

---

## Найденные пробелы

### G1 — «Мёртвые» зависимости: `@nestjs/axios` и BullMQ (снято)
В ТЗ `@nestjs/axios` указан как «библиотека для сетевых запросов» на бэке, а Redis — под
фоновые задачи. Функциональных требований на исходящие запросы и напоминания нет.

**Решение:** обе зависимости убраны из стека (`01-overview.md`), Redis остаётся только как
Socket.IO adapter ([ADR-002](../decisions/adr-002-why-redis.md)).

Остальных пробелов не обнаружено: каждое требование ТЗ и нефункциональные сопоставлены
хотя бы одному шагу с проверкой.
