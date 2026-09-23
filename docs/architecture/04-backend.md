# 04 — Backend

## Назначение

Описывает модульную структуру NestJS, реализацию Dependency Inversion и взаимодействие слоёв.
Prisma-схема — в [05-database.md](./05-database.md), контракты API — в [06-api.md](./06-api.md).

---

## 1. Модульная структура

```
apps/backend/src/
├── main.ts                     # bootstrap, swagger, helmet, cors
├── app.module.ts
├── common/
│   ├── filters/                # Exception filter
│   ├── pipes/                  # Zod validation pipe
│   ├── interceptors/           # Logging interceptor (winston)
│   ├── guards/                 # JwtAuthGuard, BoardAccessGuard
│   ├── decorators/             # @CurrentUser(), @ClientId()
│   ├── resolvers/              # BoardAccessResolver (boardId по ресурсу)
│   ├── access/                 # BoardAccessModule (@Global): guard + resolver
│   └── health/                 # HealthController (terminus)
├── realtime/
│   ├── ws-auth.middleware.ts   # JWT в handshake Socket.IO
│   ├── room.util.ts            # имя комнаты board:{boardId}
│   ├── realtime.module.ts      # @Global: JwtModule + WsAuthMiddleware
│   └── redis-io.adapter.ts     # Socket.IO Redis adapter (@socket.io/redis-adapter)
├── auth/                 # регистрация, логин, JWT
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/ (jwt.strategy, local.strategy)
│   └── dto/
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   └── prisma-user.repository.ts
│   └── dto/
├── boards/               # доски
│   ├── boards.module.ts
│   ├── boards.controller.ts
│   ├── boards.service.ts        # бизнес-логика → не знает Prisma
│   ├── boards.gateway.ts        # Socket.IO gateway
│   ├── repositories/
│   │   ├── board.repository.ts          # ⬅ интерфейс
│   │   └── prisma-board.repository.ts   # ⬅ имплементация
│   └── dto/
├── columns/               # колонки
│   ├── columns.module.ts
│   ├── columns.controller.ts
│   ├── columns.service.ts
│   ├── repositories/
│   │   ├── column.repository.ts
│   │   └── prisma-column.repository.ts
│   └── dto/
├── cards/                 # карточки + drag&drop
│   ├── cards.module.ts
│   ├── cards.controller.ts
│   ├── cards.service.ts
│   ├── cards.gateway.ts
│   ├── repositories/
│   │   ├── card.repository.ts
│   │   └── prisma-card.repository.ts
│   └── dto/
├── comments/
│   ├── comments.module.ts
│   ├── comments.controller.ts
│   ├── comments.service.ts
│   ├── repositories/
│   │   ├── comment.repository.ts
│   │   └── prisma-comment.repository.ts
│   └── dto/
├── labels/
│   ├── labels.module.ts
│   ├── labels.controller.ts
│   ├── labels.service.ts
│   ├── repositories/
│   │   ├── label.repository.ts
│   │   └── prisma-label.repository.ts
│   └── dto/
├── activity/             # лог действий (SSE)
│   ├── activity.module.ts
│   ├── activity.controller.ts   # GET /boards/:id/activity + /stream (SSE)
│   ├── activity.service.ts      # RxJS Subject для потока
│   └── repositories/
│       ├── activity.repository.ts
│       └── prisma-activity.repository.ts
├── search/
│   ├── search.module.ts
│   ├── search.controller.ts
│   ├── search.service.ts
│   └── repositories/          # интерфейс + prisma-имплементация (read-only)
├── dashboard/
│   ├── dashboard.module.ts
│   ├── dashboard.controller.ts
│   ├── dashboard.service.ts
│   └── repositories/          # агрегаты stats (интерфейс + prisma)
└── prisma/
    ├── prisma.module.ts
    ├── prisma.service.ts
    └── repositories.module.ts   # @Global: регистрация всех *_REPOSITORY_TOKEN
```

Реализации репозиториев остаются в feature-папках; их провайдеры регистрируются глобально
в `prisma/repositories.module.ts` (см. §2).

---

## 2. Dependency Inversion — как это выглядит в коде

**Интерфейс** (репозиторий):
```ts
// boards/repositories/board.repository.ts
export const BOARD_REPOSITORY_TOKEN = 'BOARD_REPOSITORY';

export interface IBoardRepository {
  findById(id: string): Promise<Board | null>;                                  // для guard (owner + id)
  findByIdWithColumns(id: string): Promise<BoardWithColumns | null>;            // деталь доски
  findByOwner(ownerId: string, page?: number, limit?: number, search?: string): Promise<Paginated<Board>>;
  create(data: { title: string; ownerId: string }): Promise<Board>;
  update(id: string, data: { title?: string }): Promise<Board>;
  delete(id: string): Promise<void>;
}
```

**Интерфейс карточного репозитория** (на него опирается `08-testing.md`):
```ts
// cards/repositories/card.repository.ts
export const CARD_REPOSITORY_TOKEN = 'CARD_REPOSITORY';

export interface ICardRepository {
  findById(id: string): Promise<Card | null>;
  findManyByColumn(columnId: string): Promise<Card[]>;
  create(data: CreateCardInput): Promise<Card>;   // title, description?, priority?, deadline?, columnId
  update(id: string, data: UpdateCardInput): Promise<Card>;
  move(cardId: string, targetColumnId: string, targetOrder: number): Promise<void>;
  remove(id: string): Promise<void>;
}
```

**Имплементация** (Prisma):
```ts
// boards/repositories/prisma-board.repository.ts
@Injectable()
export class PrismaBoardRepository implements IBoardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdWithColumns(id: string) {
    return this.prisma.board.findUnique({
      where: { id },
      include: { columns: { include: { cards: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } } },
    });
  }

  async findByOwner(ownerId: string, page = 1, limit = 20, search?: string) {
    const where = {
      ownerId,
      ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.board.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.board.count({ where }),
    ]);
    return { items, total, page, limit };
  }
  // ...
}
```

**Сервис** (не знает про Prisma):
```ts
// boards/boards.service.ts
@Injectable()
export class BoardsService {
  constructor(
    @Inject(BOARD_REPOSITORY_TOKEN)
    private readonly boardRepo: IBoardRepository,
    private readonly activityService: ActivityService,
    private readonly boardsGateway: BoardsGateway,
  ) {}

  async create(ownerId: string, title: string, actorId: string, clientId: string) {
    const board = await this.boardRepo.create({ title, ownerId });
    await this.activityService.log(board.id, 'board.created', {}, actorId);
    this.boardsGateway.emitBoardUpdated({ board, actorId, clientId });
    return board;
  }
}
```

**Сборка модуля** (wire):
```ts
// boards/boards.module.ts
@Module({
  imports: [ActivityModule],        // ActivityService для логов
  controllers: [BoardsController],
  providers: [BoardsService, BoardsGateway],
  exports: [BoardsService, BoardsGateway],
})
export class BoardsModule {}
```

### Глобальные модули: репозитории и доступ к доске

Репозитории и `BoardAccessGuard` вынесены в два `@Global()`-модуля — это снимает циклические
зависимости и даёт guard'у доступ ко всем репозиториям (`comment → card → column → board`):

```ts
// prisma/repositories.module.ts
@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    { provide: BOARD_REPOSITORY_TOKEN,    useClass: PrismaBoardRepository },
    { provide: COLUMN_REPOSITORY_TOKEN,   useClass: PrismaColumnRepository },
    { provide: CARD_REPOSITORY_TOKEN,     useClass: PrismaCardRepository },
    { provide: COMMENT_REPOSITORY_TOKEN,  useClass: PrismaCommentRepository },
    { provide: LABEL_REPOSITORY_TOKEN,    useClass: PrismaLabelRepository },
    { provide: ACTIVITY_REPOSITORY_TOKEN, useClass: PrismaActivityRepository },
    // ...остальные токены
  ],
  exports: [BOARD_REPOSITORY_TOKEN, COLUMN_REPOSITORY_TOKEN, /* ... */],
})
export class RepositoriesModule {}

// common/access/board-access.module.ts
@Global()
@Module({
  providers: [BoardAccessResolver, BoardAccessGuard],
  exports: [BoardAccessResolver, BoardAccessGuard],
})
export class BoardAccessModule {}
```

- `RepositoriesModule` и `BoardAccessModule` подключаются один раз в `AppModule` (вместе с
  `PrismaModule`); feature-модули инжектят токены и `@UseGuards(BoardAccessGuard)` без
  `imports`/`forwardRef`.
- `ActivityModule` (guard глобальный) **не импортирует** `BoardsModule`, а `BoardsModule`
  импортирует `ActivityModule` → направление одностороннее, циклов нет.
- Feature-модули импортируют `BoardsModule` только когда нужны `BoardsGateway`/`BoardsService`
  (например, `ColumnsModule` для `column.*`).

---

## 3. Realtime: WebSocket + SSE

### Зачем два канала

- **Socket.IO** — доска (карточки, колонки): нужен двунаправленный канал и fallback-транспорты.
- **SSE** — лог активности: поток только «сервер → клиент», проще и дешевле.

### WebSocket (Socket.IO)

- **Gateway** в модулях `boards` и `cards`; события колонок (`column.*`) эмитит `BoardsGateway`
  (отдельный gateway в `columns` не заводим). `ColumnsModule` импортирует `BoardsModule`,
  который экспортирует `BoardsGateway`.
- Дефолтный namespace, комната `board:{boardId}`; серверные события несут `actorId` и `clientId`
- Сервис вызывает gateway напрямую (тот же Inject), gateway шлёт событие в комнату

```
Client → Server: joinBoard { boardId, clientId }, leaveBoard { boardId }
Server → Client: board.updated, column.created, column.updated, column.deleted,
card.created, card.updated, card.moved, card.deleted, comment.created
```

### Авторизация WebSocket

- Клиент передаёт access-токен в handshake: `io(url, { auth: { token } })`.
- Серверный middleware (`server.use`) валидирует JWT и кладёт `socket.data.user`.
- `joinBoard` проверяет `board.ownerId === user.id`; иначе `error { code: 'FORBIDDEN' }` без `socket.join`.
- Комнату покидают в `leaveBoard` и при `disconnect`.
- Контроллеры читают `X-Client-Id` из мутирующих REST-запросов и передают в сервис; gateway
  кладёт его в payload события (дедуп на клиенте, см. [06-api.md](./06-api.md#2-websocket-socketio)).
- CORS: `RedisIoAdapter.createIOServer` выставляет `cors: { origin: env.CORS_ORIGIN,
  credentials: true }` (env недоступен на этапе статической метадекоратора gateway), иначе
  handshake с `http://localhost:5173` блокируется.
- Мультиинстанс: `RedisIoAdapter` (`@socket.io/redis-adapter`) подключается в `main.ts`
  (`connectToRedis()` + `app.useWebSocketAdapter`) и держит собственные ioredis-соединения,
  чтобы не конфликтовать с Pub/Sub-подписчиком активности.

### SSE (activity)

`GET /api/boards/:id/activity/stream` → `text/event-stream`.
`ActivityService` держит локальные RxJS `Subject` (по доске), контроллер отдаёт `Observable`
с heartbeat каждые 15 c. Авторизация — access-токен в заголовке `Authorization`
(клиент использует `@microsoft/fetch-event-source`).
SSE не дублируется в WebSocket — `activity.new` из Socket.IO убран.

Чтобы поток работал при нескольких инстансах (как Socket.IO через Redis adapter),
`ActivityService.log()` **публикует** запись в Redis Pub/Sub (`board:{boardId}:activity`),
а каждый инстанс подписан и раздаёт событие своим локальным SSE-подписчикам. Без этого
SSE-клиенты получали бы только события, записанные на их инстансе. Fan-out в SSE делается
только в обработчике подписки; `log()` не эмитит локально напрямую, чтобы не удвоить событие.

Детали событий: [06-api.md](./06-api.md#2-websocket-socketio)

## 4. Авторизация ресурсов (ownership)

Модель прав простая: **владелец = автор доски**, доступ только к своим доскам.

- `JwtAuthGuard` — глобальный, аутентификация.
- `BoardAccessGuard` — авторизация, `@Global()` (`BoardAccessModule`), ставится на контроллеры
  с ресурсом доски.
- `BoardAccessResolver` — принимает `req` (метод + шаблон маршрута + `params`) и возвращает `boardId`:
  напрямую из `:boardId`/`:id` доски либо через ресурс (`:id` column/card/comment/label,
  `:columnId`/`:cardId`) — column → board, card → column → board, comment → card → board,
  label → board. Различает ресурсы по методу и шаблону маршрута, а не по имени `:id`.
  Благодаря `RepositoriesModule` инжектит нужные репозитории, не создавая циклов модулей.

```ts
// common/guards/board-access.guard.ts
@Injectable()
export class BoardAccessGuard implements CanActivate {
  constructor(
    private readonly resolver: BoardAccessResolver,
    @Inject(BOARD_REPOSITORY_TOKEN)
    private readonly boards: IBoardRepository,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const boardId = await this.resolver.resolveBoardId(req);
    const board = await this.boards.findById(boardId);
    if (!board || board.ownerId !== req.user.id) {
      throw new NotFoundException({ error: 'BOARD_NOT_FOUND' });
    }
    req.board = board;   // контроллер передаёт board.id в сервис (activity, события)
    return true;
  }
}
```

Чужой ресурс отвечает `404 BOARD_NOT_FOUND` — так же, как несуществующий, чтобы не
раскрывать существование (см. [ADR-008](../decisions/adr-008-ownership-only-access.md)).
`403` остаётся для бизнес-правил внутри доступной доски.

## 5. Reorder карточек (drag&drop)

`PATCH /api/cards/:id/move` с `{ columnId, order }` выполняется в транзакции и **перенормирует**
`order` затронутых колонок в диапазон `0..n-1`. Транзакция и перенормировка живут в
**репозитории** (`PrismaCardRepository.move`), сервис только оркестрирует — Prisma в сервис
не протекает:

```ts
// cards/repositories/prisma-card.repository.ts (имплементация)
async move(cardId: string, targetColumnId: string, targetOrder: number) {
  return this.prisma.$transaction(async (tx) => {
    const card = await tx.card.findUniqueOrThrow({ where: { id: cardId } });
    const fromColumnId = card.columnId;

    await tx.card.update({
      where: { id: cardId },
      data: { columnId: targetColumnId, order: targetOrder },
    });

    await this.renumber(tx, [targetColumnId, fromColumnId]);
  });
}

// cards/cards.service.ts (не знает Prisma)
async moveCard(
  cardId: string, targetColumnId: string, targetOrder: number,
  boardId: string, actorId: string, clientId: string,
) {
  const card = await this.cardRepo.findById(cardId);
  if (!card) throw new NotFoundException({ error: 'CARD_NOT_FOUND' });

  await this.cardRepo.move(cardId, targetColumnId, targetOrder);
  await this.activityService.log(boardId, 'card.moved', { cardId, targetColumnId }, actorId);
  this.cardsGateway.emitCardMoved({ cardId, targetColumnId, newOrder: targetOrder, actorId, clientId });
}
```

- Перенормировка идёт в два прохода (сдвиг в «хвост», затем запись `0..n-1`) — безопасно,
  если позже на `Card` появится `@@unique([columnId, order])`.
- На `Column` уже стоит `@@unique([boardId, order])`, поэтому перестановка колонок (если добавим)
  обязана использовать двухфазный апдейт.

## 6. Optimistic locking (`expectedUpdatedAt`)

`PATCH /api/cards/:id` с `expectedUpdatedAt` применяется атомарно в репозитории:
`updateMany({ where: { id, updatedAt: expected }, data })`; `count === 0` → сервис бросает
`409 CONFLICT`. Без `expectedUpdatedAt` — обычный `update`. Это исключает гонку read-then-write
и не требует блокировок.

---

## Ссылки

- Схема БД: [05-database.md](./05-database.md)
- API-контракты: [06-api.md](./06-api.md)
- Тестирование через DI: [08-testing.md](./08-testing.md)
- Общие принципы: [01-overview.md](./01-overview.md)
