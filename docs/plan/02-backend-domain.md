# Фаза 2 — Backend домен

Результат фазы: полный REST API по `06-api.md`, ownership-guard, reorder, activity/SSE,
search и stats. Каждый модуль — отдельный шаг с юнит- и интеграционными тестами.

---

## Шаг 2.1 — Boards + ownership

**Цель:** CRUD досок с проверкой владельца и пагинацией.

**Артефакты:**
- `src/boards/{module,controller,service}.ts`, `dto/`
- `src/boards/repositories/{board.repository.ts, prisma-board.repository.ts}`
- `src/common/guards/board-access.guard.ts`, `src/common/resolvers/board-access.resolver.ts`
- `src/common/access/board-access.module.ts` — `@Global()`: guard + resolver

**Зависимости:** 1.2, 1.3.

**Definition of Ready:** 1.3 `done`; shared board-схемы.

**Действия:**
1. `GET /api/boards?page&limit&search` → `Paginated<Board>` (только доски владельца).
2. `POST /api/boards`, `GET /api/boards/:id` (с columns+cards), `PATCH`, `DELETE`.
3. `BoardAccessResolver.resolveBoardId(req)` — по методу + шаблону маршрута + `params` резолвит
   `boardId` для board/column/card/comment/label-ресурсов.
4. `BoardAccessGuard` — `ownerId === user.id`, иначе `404 BOARD_NOT_FOUND` (не раскрываем существование чужой доски).
5. Зарегистрировать `BOARD_REPOSITORY_TOKEN` → `PrismaBoardRepository` в `RepositoriesModule`
   и подключить `BoardAccessModule` в `AppModule`.

**Тесты:**
- Unit: `BoardsService` с мок-репозиторием.
- Integration: CRUD; доступ к чужой доске → 404; пагинация `total`.

**Команда проверки:**
```bash
pnpm --filter @min-trello/backend test
pnpm --filter @min-trello/backend test:e2e
curl -s -b /tmp/c localhost:3000/api/boards
curl -s -b /tmp/c -X POST localhost:3000/api/boards -H 'Content-Type: application/json' -d '{"title":"My Board"}'
```

**Ожидаемый результат (DoD):** доска создаётся/читается; чужая → 404; список пагинирован.

**Откат:** revert коммита.
**Продолжение после паузы:** `pnpm --filter @min-trello/backend test && curl /api/boards`.
**Оценка:** 1 день.
**Commit:** `feat(boards): crud with ownership guard and pagination`

---

## Шаг 2.2 — Columns

**Цель:** CRUD колонок внутри доски с корректным порядком.

**Артефакты:** `src/columns/{module,controller,service}.ts`, `dto/`, `columns/repositories/*`.

**Зависимости:** 2.1.

**Definition of Ready:** 2.1 `done`.

**Действия:**
1. `POST /api/boards/:boardId/columns` — order = max+1 в транзакции; при гонке на
   `@@unique([boardId, order])` (`P2002`) — retry.
2. `PATCH /api/columns/:id` (title, `isDone`, order), `DELETE /api/columns/:id`.
3. Guard: `columns/:id` через resolver (column→board).
4. При изменении `order` — перенормировка с учётом `@@unique([boardId, order])`.
5. Эмиссия `column.created/updated/deleted` через `BoardsGateway` (комната `board:{boardId}`) —
   подключается в шаге 3.1 (до него сервис работает без gateway).
6. Зарегистрировать `COLUMN_REPOSITORY_TOKEN` → `PrismaColumnRepository` в `RepositoriesModule`.

**Тесты:** Unit (границы order, уникальность), Integration (создание/удаление, чужой board → 404).

**Команда проверки:**
```bash
pnpm --filter @min-trello/backend test
pnpm --filter @min-trello/backend test:e2e
curl -s -b /tmp/c -X POST localhost:3000/api/boards/<id>/columns -H 'Content-Type: application/json' -d '{"title":"In Progress"}'
```

**Ожидаемый результат (DoD):** три колонки создаются; порядок 0,1,2; дубликата order нет.

**Откат:** revert коммита.
**Продолжение после паузы:** `pnpm --filter @min-trello/backend test`.
**Оценка:** 0.5 дня.
**Commit:** `feat(columns): crud with ordered positions`

---

## Шаг 2.3 — Cards + reorder + assignee

**Цель:** CRUD карточек, перемещение с перенормировкой, назначение исполнителя.

**Артефакты:** `src/cards/{module,controller,service}.ts`, `dto/`, `cards/repositories/*`.

**Зависимости:** 2.2.

**Definition of Ready:** 2.2 `done`.

**Действия:**
1. `POST /api/columns/:columnId/cards`, `GET /api/cards/:id`, `PATCH`, `DELETE`.
2. `PATCH /api/cards/:id/move` — транзакция: update + `renumber(from,to)` (двухфазный проход).
3. `PATCH /api/cards/:id/assignee` — `assigneeId: string | null`; значение обязано равняться
   владельцу доски (ownership, ADR-008), иначе `422`.
4. `PATCH` принимает `expectedUpdatedAt`; рассинхрон → `409` (атомарный `updateMany`, см. `04-backend.md` §6).
5. Guard через resolver (card→column→board).
6. Зарегистрировать `CARD_REPOSITORY_TOKEN` → `PrismaCardRepository` в `RepositoriesModule`.

**Тесты:**
- Unit: reorder (начало/середина/конец/другая колонка, пустая колонка), 409.
- Integration: move меняет `order` последовательно `0..n-1`.

**Команда проверки:**
```bash
pnpm --filter @min-trello/backend test
pnpm --filter @min-trello/backend test:e2e
curl -s -b /tmp/c -X PATCH localhost:3000/api/cards/<id>/move -H 'Content-Type: application/json' -d '{"columnId":"<col>","order":0}'
```

**Ожидаемый результат (DoD):** после серии move `order` в колонке = `0..n-1` без пропусков/дублей.

**Откат:** revert коммита.
**Продолжение после паузы:** `pnpm --filter @min-trello/backend test`.
**Оценка:** 1.5 дня.
**Commit:** `feat(cards): crud, transactional reorder and assignee`

---

## Шаг 2.4 — Labels (board-scoped)

**Цель:** метки в пределах доски и привязка к карточкам.

**Артефакты:** `src/labels/{module,controller,service}.ts`, `dto/`, `labels/repositories/*`.

**Зависимости:** 2.1, 2.3.

**Definition of Ready:** 2.1 и 2.3 `done`.

**Действия:**
1. `POST/GET /api/boards/:boardId/labels`, `DELETE /api/labels/:id`.
2. `POST /api/cards/:cardId/labels`, `DELETE /api/cards/:cardId/labels/:labelId`.
3. Проверка: label.boardId === card.column.boardId (нельзя привязать чужую метку).
4. Зарегистрировать `LABEL_REPOSITORY_TOKEN` → `PrismaLabelRepository` в `RepositoriesModule`.

**Тесты:** Unit (уникальность `[boardId,name]`, чужой board → 404), Integration.

**Команда проверки:**
```bash
pnpm --filter @min-trello/backend test
pnpm --filter @min-trello/backend test:e2e
curl -s -b /tmp/c -X POST localhost:3000/api/boards/<id>/labels -H 'Content-Type: application/json' -d '{"name":"bug","color":"#f00"}'
```

**Ожидаемый результат (DoD):** метка уникальна в доске; привязка/отвязка работает.

**Откат:** revert коммита.
**Продолжение после паузы:** `pnpm --filter @min-trello/backend test`.
**Оценка:** 0.5 дня.
**Commit:** `feat(labels): board-scoped labels and card assignment`

---

## Шаг 2.5 — Comments

**Цель:** комментарии к карточкам с автором и временем.

**Артефакты:** `src/comments/{module,controller,service}.ts`, `dto/`, `comments/repositories/*`.

**Зависимости:** 2.3.

**Definition of Ready:** 2.3 `done`.

**Действия:**
1. `GET /api/cards/:cardId/comments?page&limit` → `Paginated<Comment>`.
2. `POST /api/cards/:cardId/comments`, `DELETE /api/comments/:id` (только автор).
3. Guard через resolver (comment→card→board).
4. Зарегистрировать `COMMENT_REPOSITORY_TOKEN` → `PrismaCommentRepository` в `RepositoriesModule`;
   эмиссия `comment.created` подключается в шаге 3.1.

**Тесты:** Unit (автор; чужой/недоступный ресурс → 404), Integration (пагинация, момент времени).

**Команда проверки:**
```bash
pnpm --filter @min-trello/backend test
pnpm --filter @min-trello/backend test:e2e
curl -s -b /tmp/c -X POST localhost:3000/api/cards/<id>/comments -H 'Content-Type: application/json' -d '{"content":"ping"}'
```

**Ожидаемый результат (DoD):** комментарий с `authorId`, `createdAt`; удаление только автором.

**Откат:** revert коммита.
**Продолжение после паузы:** `pnpm --filter @min-trello/backend test`.
**Оценка:** 0.5 дня.
**Commit:** `feat(comments): comments with author and pagination`

---

## Шаг 2.6 — Activity + SSE

**Цель:** лог действий и поток обновлений.

**Артефакты:**
- `src/activity/{module,controller,service}.ts`
- `activity/repositories/*`
- `Subject`-поток + Redis Pub/Sub (`board:{boardId}:activity`) в `ActivityService`

**Зависимости:** 0.3, 2.1, 2.3, 2.5.

**Definition of Ready:** 2.1, 2.3, 2.5 `done`; Redis поднят (0.3).

**Действия:**
1. `log(boardId, action, payload)` вызывается сервисами (board/card/comment create/update/move/delete);
   `boardId` берётся из guard'а (`req.board.id`). Это **ретрофит** `BoardsService`/`CardsService`/
   `CommentsService` из шагов 2.1/2.3/2.5.
2. `log()` публикует запись в Redis Pub/Sub (`board:{boardId}:activity`); `ActivityService` подписан
   и раздаёт событие локальным SSE-подписчикам (multi-instance), сам при публикации локально не эмитит.
3. `GET /api/boards/:id/activity?page&limit` → `Paginated<ActivityLog>`.
4. `GET /api/boards/:id/activity/stream` — SSE: `activity` + `ping` (15 c), отписка на disconnect.
5. Заголовки: `text/event-stream`, `no-cache`, `keep-alive`, `X-Accel-Buffering: no` (чтобы nginx не буферизовал).
6. Зарегистрировать `ACTIVITY_REPOSITORY_TOKEN` → `PrismaActivityRepository` в `RepositoriesModule`.

**Тесты:** Unit (пишется лог с нужным action/payload), Integration (SSE получает `activity` и `ping`).

**Команда проверки:**
```bash
pnpm --filter @min-trello/backend test
pnpm --filter @min-trello/backend test:e2e
curl -N -b /tmp/c localhost:3000/api/boards/<id>/activity/stream
```

**Ожидаемый результат (DoD):** при изменении карточки в поток приходит `activity`; раз в 15 c — `ping`.

**Откат:** revert коммита (события не подключены в others).
**Продолжение после паузы:** `curl -N .../stream`.
**Оценка:** 1 день.
**Commit:** `feat(activity): board activity log with sse stream`

---

## Шаг 2.7 — Search + Dashboard

**Цель:** поиск/фильтры и статистика.

**Артефакты:** `src/search/{module,controller,service}.ts`, `src/dashboard/{module,controller,service}.ts`,
`src/search/repositories/*`, `src/dashboard/repositories/*` (доступ к данным через интерфейсы, не Prisma в сервисе).

**Зависимости:** 2.3.

**Definition of Ready:** 2.3 `done`.

**Действия:**
1. `GET /api/boards/:id/search?q&priority&label&assignee&hasDeadline&page&limit`.
2. `GET /api/search?...` — глобально по доскам пользователя.
3. `GET /api/dashboard/stats` → `{ totalBoards, totalCards, cardsByStatus, overdueCards }` (scope — владелец);
   `overdueCards` учитывает `Column.isDone`, `cardsByStatus` — группировка по колонкам.
4. Зарегистрировать `*_REPOSITORY_TOKEN` для search/dashboard в `RepositoriesModule`.

**Тесты:** Unit (построение where), Integration (точность фильтров, scope).

**Команда проверки:**
```bash
pnpm --filter @min-trello/backend test
pnpm --filter @min-trello/backend test:e2e
curl -s -b /tmp/c "localhost:3000/api/search?priority=high&hasDeadline=true"
curl -s -b /tmp/c localhost:3000/api/dashboard/stats
```

**Ожидаемый результат (DoD):** фильтры дают корректную выборку; stats считает только доски пользователя.

**Откат:** revert коммита.
**Продолжение после паузы:** `pnpm --filter @min-trello/backend test`.
**Оценка:** 1 день.
**Commit:** `feat(search,dashboard): filters, global search and stats`
