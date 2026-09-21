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
│   ├── decorators/             # @CurrentUser()
│   └── health/                 # HealthController (terminus)
├── auth/                 # регистрация, логин, JWT
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/ (jwt.strategy, local.strategy)
│   └── dto/
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   └── users.service.ts
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
│   └── activity.service.ts      # RxJS Subject для потока
├── search/
│   ├── search.module.ts
│   ├── search.controller.ts
│   └── search.service.ts
├── dashboard/
│   ├── dashboard.module.ts
│   ├── dashboard.controller.ts
│   └── dashboard.service.ts
└── prisma/
    ├── prisma.module.ts
    └── prisma.service.ts
```

---

## 2. Dependency Inversion — как это выглядит в коде

**Интерфейс** (репозиторий):
```ts
// boards/repositories/board.repository.ts
export const BOARD_REPOSITORY_TOKEN = 'BOARD_REPOSITORY';

export interface IBoardRepository {
  findById(id: string): Promise<Board | null>;
  findByOwner(ownerId: string, page?: number, limit?: number): Promise<Board[]>;
  create(data: { title: string; ownerId: string }): Promise<Board>;
  update(id: string, data: { title?: string }): Promise<Board>;
  delete(id: string): Promise<void>;
}
```

**Имплементация** (Prisma):
```ts
// boards/repositories/prisma-board.repository.ts
@Injectable()
export class PrismaBoardRepository implements IBoardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.board.findUnique({
      where: { id },
      include: { columns: { include: { cards: true }, orderBy: { order: 'asc' } } },
    });
  }

  async findByOwner(ownerId: string, page = 1, limit = 20) {
    return this.prisma.board.findMany({
      where: { ownerId },
      skip: (page - 1) * limit,
      take: limit,
    });
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
  ) {}

  async create(ownerId: string, title: string) {
    const board = await this.boardRepo.create({ title, ownerId });
    await this.activityService.log('board.created', { boardId: board.id });
    return board;
  }
}
```

**Сборка модуля** (wire):
```ts
// boards/boards.module.ts
@Module({
  controllers: [BoardsController],
  providers: [
    BoardsService,
    BoardsGateway,
    { provide: BOARD_REPOSITORY_TOKEN, useClass: PrismaBoardRepository },
  ],
})
export class BoardsModule {}
```

---

## 3. Realtime: WebSocket + SSE

### Зачем два канала

- **Socket.IO** — доска (карточки, колонки): нужен двунаправленный канал и fallback-транспорты.
- **SSE** — лог активности: поток только «сервер → клиент», проще и дешевле.

### WebSocket (Socket.IO)

- **Gateway** в модулях `boards` и `cards`
- Дефолтный namespace, комната `board:{boardId}`
- Сервис вызывает gateway напрямую (тот же Inject), gateway шлёт событие в комнату

```
Client → Server: joinBoard { boardId }, leaveBoard { boardId }
Server → Client: board.updated, card.created, card.updated, card.moved, card.deleted, comment.created
```

### Авторизация WebSocket

- Клиент передаёт access-токен в handshake: `io(url, { auth: { token } })`.
- Серверный middleware (`server.use`) валидирует JWT и кладёт `socket.data.user`.
- `joinBoard` проверяет `board.ownerId === user.id`; иначе `error { code: 'FORBIDDEN' }` без `socket.join`.
- Комнату покидают в `leaveBoard` и при `disconnect`.

### SSE (activity)

`GET /api/boards/:id/activity/stream` → `text/event-stream`.
`ActivityService` держит RxJS `Subject`, контроллер отдаёт `Observable` с heartbeat каждые 15 c.
Авторизация — access-токен в заголовке `Authorization` (клиент использует `@microsoft/fetch-event-source`).
SSE не дублируется в WebSocket — `activity.new` из Socket.IO убран.

Детали событий: [06-api.md](./06-api.md#2-websocket-socketio)

## 4. Авторизация ресурсов (ownership)

Модель прав простая: **владелец = автор доски**, доступ только к своим доскам.

- `JwtAuthGuard` — глобальный, аутентификация.
- `BoardAccessGuard` — авторизация, ставится на контроллеры с ресурсом доски.
- `BoardAccessResolver` — по параметрам (`boardId`, `columnId`, `cardId`, `commentId`, `labelId`)
  находит `boardId` и владельца.

```ts
// common/guards/board-access.guard.ts
@Injectable()
export class BoardAccessGuard implements CanActivate {
  constructor(
    private readonly resolver: BoardAccessResolver,
    private readonly boards: BoardsService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const boardId = await this.resolver.resolveBoardId(req.params);
    const board = await this.boards.findById(boardId);
    if (!board) throw new NotFoundException({ error: 'BOARD_NOT_FOUND' });
    if (board.ownerId !== req.user.id) throw new ForbiddenException({ error: 'FORBIDDEN' });
    return true;
  }
}
```

`403` не раскрывает существование чужих ресурсов.

## 5. Reorder карточек (drag&drop)

`PATCH /api/cards/:id/move` с `{ columnId, order }` выполняется в транзакции и **перенормирует**
`order` затронутых колонок в диапазон `0..n-1`:

```ts
async moveCard(cardId: string, targetColumnId: string, targetOrder: number) {
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
```

- Перенормировка идёт в два прохода (сдвиг в «хвост», затем запись `0..n-1`) — безопасно,
  если позже на `Card` появится `@@unique([columnId, order])`.
- На `Column` уже стоит `@@unique([boardId, order])`, поэтому перестановка колонок (если добавим)
  обязана использовать двухфазный апдейт.

---

## Ссылки

- Схема БД: [05-database.md](./05-database.md)
- API-контракты: [06-api.md](./06-api.md)
- Тестирование через DI: [08-testing.md](./08-testing.md)
- Общие принципы: [01-overview.md](./01-overview.md)
