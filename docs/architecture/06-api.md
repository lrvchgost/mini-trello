# 06 — API Contracts

## Назначение

Полный перечень REST-эндпоинтов и WebSocket-событий.
Swagger-документация генерируется автоматически через `@nestjs/swagger` и доступна по `/api/docs`.

Модели данных: [05-database.md](./05-database.md)

---

## 0. Общие форматы

Списки, требующие пагинации (boards, comments, activity, search), возвращаются единообразно
(offset-based):

```ts
interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
```

Query-параметры: `?page=1&limit=20` (по умолчанию `page=1`, `limit=20`).

Все мутирующие запросы к ресурсам доски (`/api/boards`, `/api/columns`, `/api/cards`,
`/api/labels`, `/api/comments`) несут заголовок `X-Client-Id: <id вкладки>`; сервер прокидывает
его как `clientId` в соответствующее WebSocket-событие (§2) — для дедупа своих изменений
между вкладками. Auth-эндпоинты (`/api/auth/*`) заголовок не используют.

Единый формат ошибки (`AllExceptionsFilter`):

```ts
interface ApiError {
  statusCode: number;   // 400 | 401 | 403 | 404 | 409 | 422 | 500
  error: string;        // машиночитаемый код: "FORBIDDEN", "BOARD_NOT_FOUND"
  message: string;      // человекочитаемое
  details?: unknown;    // zod issues при 422
  timestamp: string;
  path: string;
}
```

- `401` — нет/просрочен access-токен
- `403` — нет прав на бизнес-операцию внутри доступной доски;
  доступ к чужой/несуществующей доске → `404 BOARD_NOT_FOUND` (не раскрываем существование)
- `409` — конфликт версий (optimistic locking, `expectedUpdatedAt`)
- `422` — ошибка валидации zod

---

## 1. REST API

### Auth

| Method | Path | Ответ | Описание |
|--------|------|-------|----------|
| POST | `/api/auth/register` | `201 { user, accessToken }` | Регистрация + refresh-cookie |
| POST | `/api/auth/login` | `200 { user, accessToken }` | Вход |
| GET | `/api/auth/me` | `200 User` | Текущий пользователь |
| POST | `/api/auth/refresh` | `200 { accessToken }` | Обновить access-токен по httpOnly cookie |
| POST | `/api/auth/logout` | `204` | Отозвать refresh-токен и очистить cookie |

Access-токен живёт 15 минут и хранится **в памяти** клиента; refresh — 7 дней в
httpOnly/Secure/SameSite=Lax cookie (см. [ADR-004](../decisions/adr-004-auth-tokens.md)).
`register`, как и `login`, выставляет refresh-cookie — сессия переживает перезагрузку сразу
после регистрации.

Дубликат email при `register` → `409 EMAIL_TAKEN`. `refresh` ротируется: клиент объединяет
параллельные вызовы (single-flight) и координирует вкладки через `navigator.locks` +
`BroadcastChannel`, а сервер в окне `REFRESH_GRACE_SECONDS` принимает недавно отозванный токен
и выдаёт новую пару — иначе вкладки разлогиниваются.

### Users

| Method | Path | Ответ | Описание |
|--------|------|-------|----------|
| GET | `/api/users` | `200 User[]` | Доступные исполнители — массив из одного элемента (текущий пользователь; ownership, [ADR-008](../decisions/adr-008-ownership-only-access.md)) |
| PATCH | `/api/users/me` | `200 User` | Обновить профиль (`name`) |
| PATCH | `/api/users/me/password` | `204` | Сменить пароль (`oldPassword`, `newPassword`) |

### Boards

| Method | Path | Ответ | Описание |
|--------|------|-------|----------|
| GET | `/api/boards` | `200 Paginated<Board>` | Список досок (`?page&limit&search`) |
| POST | `/api/boards` | `201 Board` | Создать доску |
| GET | `/api/boards/:id` | `200 Board` | Доска с колонками и карточками |
| PATCH | `/api/boards/:id` | `200 Board` | Обновить доску |
| DELETE | `/api/boards/:id` | `204` | Удалить доску |

### Columns

| Method | Path | Ответ | Описание |
|--------|------|-------|----------|
| POST | `/api/boards/:boardId/columns` | `201 Column` | Создать колонку |
| PATCH | `/api/columns/:id` | `200 Column` | Обновить колонку (`title`, `isDone`, `order`) |
| DELETE | `/api/columns/:id` | `204` | Удалить колонку |

### Cards

| Method | Path | Ответ | Описание |
|--------|------|-------|----------|
| POST | `/api/columns/:columnId/cards` | `201 Card` | Создать карточку |
| GET | `/api/cards/:id` | `200 Card` | Карточка с лейблами, исполнителем, комментариями |
| PATCH | `/api/cards/:id` | `200 Card` | Обновить карточку (`expectedUpdatedAt` → `409` при рассинхроне) |
| PATCH | `/api/cards/:id/move` | `200 { columnId, order }` | Переместить (drag&drop) |
| PATCH | `/api/cards/:id/assignee` | `200 Card` | Назначить исполнителя (`assigneeId: string \| null`); значение обязано равняться владельцу доски, иначе `422` |
| DELETE | `/api/cards/:id` | `204` | Удалить карточку |

### Labels

| Method | Path | Ответ | Описание |
|--------|------|-------|----------|
| POST | `/api/boards/:boardId/labels` | `201 Label` | Создать метку |
| GET | `/api/boards/:boardId/labels` | `200 Label[]` | Список меток доски |
| DELETE | `/api/labels/:id` | `204` | Удалить метку |
| POST | `/api/cards/:cardId/labels` | `200 CardDetail` | Добавить метку к карточке (`{ labelId }`) |
| DELETE | `/api/cards/:cardId/labels/:labelId` | `204` | Удалить метку с карточки |

### Comments

| Method | Path | Ответ | Описание |
|--------|------|-------|----------|
| GET | `/api/cards/:cardId/comments` | `200 Paginated<Comment>` | Комментарии (`?page&limit`) |
| POST | `/api/cards/:cardId/comments` | `201 Comment` | Добавить комментарий |
| DELETE | `/api/comments/:id` | `204` | Удалить комментарий |

### Search / Filters

| Method | Path | Ответ | Описание |
|--------|------|-------|----------|
| GET | `/api/boards/:id/search` | `200 Paginated<Card>` | Фильтр внутри доски (`?q=&priority=&label=&assignee=&hasDeadline=&page=&limit=`) |
| GET | `/api/search` | `200 Paginated<Card>` | Глобальный поиск по доскам пользователя (те же фильтры) |

Board-scoped поиск питает FilterBar на канбане, глобальный `/api/search` — экран `/search` в FE.

### Activity

| Method | Path | Ответ | Описание |
|--------|------|-------|----------|
| GET | `/api/boards/:id/activity` | `200 Paginated<ActivityLog>` | `?page=&limit=` |
| GET | `/api/boards/:id/activity/stream` | `text/event-stream` | SSE-поток новых записей активности |

SSE-события: `activity` (payload — `ActivityLog`), `ping` (heartbeat каждые 15 c).

### Dashboard / Stats

| Method | Path | Ответ | Описание |
|--------|------|-------|----------|
| GET | `/api/dashboard/stats` | `200 Stats` | По доскам пользователя: `{ totalBoards, totalCards, cardsByStatus, overdueCards }`. `cardsByStatus` — число карточек по колонкам; `overdueCards` — `deadline < now` вне колонок с `isDone = true` |

### Health

| Method | Path | Ответ | Описание |
|--------|------|-------|----------|
| GET | `/api/health` | `200 { status, uptime, db }` | Проверка работоспособности |

---

## 2. WebSocket (Socket.IO)

**Комната:** `board:{boardId}`. Клиент подключается с `auth: { token }`; `joinBoard`
проверяет владельца доски. Активность по WebSocket **не рассылается** — только SSE.
В payload серверных событий входят `actorId` и `clientId` инициатора; клиент применяет
событие, если `clientId` не совпадает с его собственным (дедуп между вкладками).

### Client → Server

| Событие | Payload | Описание |
|---------|---------|----------|
| `joinBoard` | `{ boardId, clientId }` | Подписаться на обновления доски (`clientId` — id вкладки) |
| `leaveBoard` | `{ boardId }` | Отписаться |

### Server → Client

| Событие | Payload | Описание |
|---------|---------|----------|
| `board.updated` | `{ board, actorId, clientId }` | Изменение доски |
| `column.created` | `{ column, actorId, clientId }` | Новая колонка |
| `column.updated` | `{ column, actorId, clientId }` | Обновление колонки |
| `column.deleted` | `{ columnId, actorId, clientId }` | Удаление колонки |
| `card.created` | `{ card, actorId, clientId }` | Новая карточка |
| `card.updated` | `{ card, actorId, clientId }` | Обновление карточки |
| `card.moved` | `{ cardId, targetColumnId, newOrder, actorId, clientId }` | Перемещение карточки |
| `card.deleted` | `{ cardId, actorId, clientId }` | Удаление карточки |
| `comment.created` | `{ comment, actorId, clientId }` | Новый комментарий |

---

## Ссылки

- Модели, лежащие в основе: [05-database.md](./05-database.md)
- Реализация модулей и gateways: [04-backend.md](./04-backend.md)
