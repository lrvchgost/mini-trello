# 05 — База данных (PostgreSQL + Prisma)

## Назначение

Схема данных, связи, индексы. Все модели описаны в Prisma Schema и мигрируются через `prisma migrate`.

---

## 1. Диаграмма связей

```
User ──owner──> Board ──has──> Column ──has──> Card ──has──> Comment
  │                │  │                             │
  │                │  └────> ActivityLog <──────────┘
  │                └────> Label ──> CardLabel ──> Card
  └──assignee──> Card
```

---

## 2. Prisma Schema

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]   // prod-образ на alpine
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Priority {
  low
  medium
  high
  urgent
}

model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String
  password  String

  boards        Board[]        @relation("Owner")
  assignedTo    Card[]         @relation("Assignee")
  comments      Comment[]
  activities    ActivityLog[]
  refreshTokens RefreshToken[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Board {
  id        String   @id @default(cuid())
  title     String
  ownerId   String
  owner     User     @relation("Owner", fields: [ownerId], references: [id], onDelete: Cascade)

  columns    Column[]
  labels     Label[]
  activities ActivityLog[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Column {
  id      String  @id @default(cuid())
  title   String
  isDone  Boolean @default(false)   // терминальная колонка для stats/overdue
  order   Int
  boardId String
  board   Board  @relation(fields: [boardId], references: [id], onDelete: Cascade)

  cards Card[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([boardId, order])
}

model Card {
  id          String    @id @default(cuid())
  title       String
  description String?   // raw Markdown
  priority    Priority  @default(medium)
  deadline    DateTime?
  order       Int
  columnId    String
  column      Column    @relation(fields: [columnId], references: [id], onDelete: Cascade)
  assigneeId  String?
  assignee    User?     @relation("Assignee", fields: [assigneeId], references: [id], onDelete: SetNull)

  comments   Comment[]
  labels     CardLabel[]
  activities ActivityLog[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([columnId, order])
  @@index([assigneeId])
  @@index([deadline])
}

model Label {
  id      String @id @default(cuid())
  name    String
  color   String @default("#6b7280")
  boardId String
  board   Board  @relation(fields: [boardId], references: [id], onDelete: Cascade)

  cards CardLabel[]

  @@unique([boardId, name])
}

model CardLabel {
  cardId  String
  card    Card   @relation(fields: [cardId], references: [id], onDelete: Cascade)
  labelId String
  label   Label  @relation(fields: [labelId], references: [id], onDelete: Cascade)

  @@id([cardId, labelId])
}

model Comment {
  id       String @id @default(cuid())
  content  String
  cardId   String
  card     Card   @relation(fields: [cardId], references: [id], onDelete: Cascade)
  authorId String
  author   User   @relation(fields: [authorId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ActivityLog {
  id        String   @id @default(cuid())
  action    String   // "card.created" | "card.moved" | "card.updated" | "comment.created" | ...
  payload   Json?    // { fromColumnId, targetColumnId, newOrder, changes }
  boardId   String
  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  cardId    String?
  card      Card?    @relation(fields: [cardId], references: [id], onDelete: SetNull)
  userId    String
  user      User     @relation(fields: [userId], references: [id])

  createdAt DateTime @default(now())

  @@index([boardId, createdAt(sort: Desc)])
}

model RefreshToken {
  id        String    @id @default(cuid())
  tokenHash String    @unique
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
  @@index([expiresAt])
}
```

---

## 3. Ключевые индексы

| Таблица | Индекс | Зачем |
|---------|--------|-------|
| `Column` | `@@unique([boardId, order])` | Гарантия порядка колонок |
| `Label` | `@@unique([boardId, name])` | Метки уникальны в пределах доски |
| `Card` | `@@index([columnId, order])`, `@@index([assigneeId])`, `@@index([deadline])` | Выборка внутри колонки; фильтры по исполнителю и `overdueCards` |
| `ActivityLog` | `@@index([boardId, createdAt(sort: Desc)])` | Лента активности с сортировкой |
| `RefreshToken` | `@unique` (`tokenHash`), `@@index([expiresAt])` | Поиск/отзыв и очистка просроченных |

---

## 4. Seed (предзаполненные данные)

Единственный механизм seed — `prisma/seed.ts` (идемпотентный, через `upsert`), запуск `pnpm db:seed`.
`docker/init.sql` не используется. Пароли хешируются bcryptjs с теми же раундами, что и в `AuthService`,
в БД попадают только хеши. Создаются 2 пользователя:

| Email | Пароль | Роль |
|-------|--------|------|
| `alice@example.com` | `password123` | Обычный пользователь |
| `bob@example.com` | `password123` | Обычный пользователь |

Каждому пользователю создаётся по 3 доски (итого 6) с колонками To Do / In Progress / Done
и по 20 задач на доску (итого 120, по 60 на пользователя), с метками, дедлайнами,
исполнителями (владелец доски) и комментариями
(детали — в плане, шаг 4.1).

---

## Ссылки

- Модули и репозитории: [04-backend.md](./04-backend.md)
- API, работающее с этими моделями: [06-api.md](./06-api.md)
- Docker Compose для поднятия БД: [07-infrastructure.md](./07-infrastructure.md)
