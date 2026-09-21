# Фаза 3 — Realtime (Socket.IO)

Результат фазы: live-обновления доски по комнатам, с авторизацией и Redis-adapter.
Активность остаётся на SSE (шаг 2.6) и по WebSocket не дублируется.

---

## Шаг 3.1 — Socket.IO gateway

**Цель:** двунаправленный канал доски, доступ только владельцу.

**Артефакты:**
- `src/boards/boards.gateway.ts`, `src/cards/cards.gateway.ts`
- `src/realtime/ws-auth.middleware.ts` (валидация JWT в handshake)
- Подключение `@socket.io/redis-adapter` + `ioredis`
- Эмиссия из `BoardsService` (board), `ColumnsService` (`column.*` через `BoardsGateway`),
  `CardsService` (`card.*`), `CommentsService` (`comment.created`); `ColumnsModule` импортирует
  `BoardsModule` (тот экспортирует gateway)

**Зависимости:** 0.3, 2.2, 2.3, 2.5.

**Definition of Ready:** 2.2, 2.3 и 2.5 `done`; Redis поднят (0.3).

**Действия:**
1. Gateway с дефолтным namespace и CORS (`origin: CORS_ORIGIN`); комната `board:{boardId}`.
2. `server.use` middleware: читает `handshake.auth.token`, валидирует JWT, кладёт `socket.data.user`; невалидный → disconnect.
3. `joinBoard` — проверка `board.ownerId === user.id`, иначе `error { code: 'FORBIDDEN' }` без `join`.
4. `leaveBoard` / `disconnect` — покинуть комнату.
5. Сервисы эмитят: `board.updated`, `column.created/updated/deleted`, `card.created`, `card.updated`,
   `card.moved`, `card.deleted`, `comment.created` с `actorId` и `clientId` (id вкладки-инициатора).
   Инициатор события определяется из заголовка `X-Client-Id` мутирующего REST-запроса.
   `joinBoard` принимает `clientId`; дедуп на клиенте — по нему. Это **ретрофит** сервисов
   шагов 2.1–2.5 (`BoardsService`, `ColumnsService`, `CardsService`, `CommentsService`);
   `comment.created` эмитит `CommentsService`.
6. Redis-adapter для нескольких инстансов.

**Тесты:**
- Unit: gateway-хендлеры (мок server/room), middleware (валидный/невалидный токен).
- Integration: 2 клиента — изменение в A приходит B; подключение без токена отклонено.

**Команда проверки:**
```bash
pnpm --filter @min-trello/backend test
# ручная проверка: node-скрипт с socket.io-client (2 подключения, один join, эмит)
```

**Ожидаемый результат (DoD):** клиент B получает `card.moved` после изменения A; без токена/чужой доски — отказ.

**Откат:** revert коммита; REST продолжает работать без WS.
**Продолжение после паузы:** `pnpm --filter @min-trello/backend test`; проверить, что REST-шаги 2.x не затронуты.
**Оценка:** 1.5 дня.
**Commit:** `feat(realtime): socket.io gateways with ws auth and rooms`
