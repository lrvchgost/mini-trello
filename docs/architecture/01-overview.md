# 01 — Обзор: стек, Dependency Inversion, SRP

## Назначение документа

Зафиксировать общие принципы и технологический стек. Этот файл — точка входа.
Детали по каждому слою — в соседних документах.

---

## 1. Технологический стек

| Слой | Технология | Назначение |
|------|-----------|------------|
| **Bundler** | Vite | Сборка фронта |
| **UI Kit** | shadcn/ui (Radix + Tailwind) | Система компонентов |
| **Charts** | Recharts | Графики статистики на дашборде |
| **State (server)** | TanStack React Query | Кэш, мутации, ревалидация |
| **State (client)** | Zustand | Локальное состояние (фильтры, UI) |
| **Router** | React Router v6 | Навигация |
| **HTTP-клиент (FE)** | ky | Лёгкий fetch-клиент |
| **HTTP-клиент (BE)** | @nestjs/axios | Исходящие запросы |
| **Forms / Validation** | react-hook-form / zod | Формы + схемы |
| **Drag & Drop** | @hello-pangea/dnd | Карточки между колонками |
| **Markdown (editor)** | MDXEditor | Редактор описания (markdown-first, поддерживается) |
| **Markdown (render)** | react-markdown + remark-gfm | Отображение |
| **Unit tests (FE)** | Vitest + @testing-library/react | Компонентные тесты |
| **E2E** | Playwright | Интеграционные тесты |
| **Storybook** | Storybook 8 | Изолированная разработка UI |
| **Framework (BE)** | NestJS | Сервер |
| **ORM** | Prisma | Доступ к БД, миграции |
| **Auth** | @nestjs/passport + JWT | Регистрация, логин |
| **Validation (BE)** | zod (через shared) | Валидация DTO |
| **WebSocket** | Socket.IO | Live-обновления доски (карточки, колонки) |
| **SSE** | @microsoft/fetch-event-source | Поток лога активности доски |
| **API Docs** | @nestjs/swagger | OpenAPI / Swagger UI |
| **Password hash** | bcrypt | Хеширование паролей |
| **Rate limit** | @nestjs/throttler | Защита от брута |
| **Security** | helmet + cors | Заголовки, CORS |
| **Logging** | winston | Структурированные логи |
| **Health** | @nestjs/terminus | Health endpoint |
| **Jobs** | BullMQ + Redis | Напоминания о дедлайнах |
| **Tests (BE)** | Jest (встроен) | Unit + e2e (supertest) |

---

## 2. Dependency Inversion — главный принцип

```
Controller → Service → Repository (interface)
                           ↑
                    PrismaRepository (imp)
```

- **Service** декларирует потребность в `IBoardRepository` — не импортирует Prisma
- **Module** связывает интерфейс с имплементацией через токен
- **Тесты мокают интерфейс** — не поднимают БД

Детали: [04-backend.md](./04-backend.md) и [08-testing.md](./08-testing.md)

---

## 3. SRP — границы ответственности

| Слой | Отвечает за | НЕ должен |
|------|-------------|-----------|
| **Controller** | Парсинг запроса, вызов сервиса, возврат ответа | Бизнес-логику, доступ к БД |
| **Service** | Бизнес-логика, оркестрация, события | HTTP, WebSocket, БД напрямую |
| **Repository** | Только данные (CRUD, query) | Бизнес-логику, валидацию |
| **Gateway (WS) / SSE Publisher** | Relay событий в Socket.IO и поток активности | Бизнес-логику |
| **Guard / Interceptor** | Cross-cutting (auth, logging, transform) | Бизнес-логику |

> **Прагматичное исключение:** сервис может вызывать gateway/SSE-publisher напрямую
> (без доменных событий) — осознанный компромисс ради простоты. При росте проекта
> заменяется на `EventEmitter`, не меняя слои Controller/Repository.

---

## 4. Общее правило

**Верхний слой не знает про нижний.**  
Service знает про Repository через интерфейс, а не через имплементацию.  
Repository можно заменить (Prisma → Drizzle → in-memory) без изменения Service.

---

## Ссылки на связанные документы

- [02-monorepo.md](./02-monorepo.md) — структура репозитория
- [04-backend.md](./04-backend.md) — реализация DI в модулях NestJS
- [08-testing.md](./08-testing.md) — как DI упрощает тесты
