import * as bcrypt from 'bcryptjs';
import { PrismaClient, Priority } from '@prisma/client';
import { BCRYPT_ROUNDS } from '../src/auth/auth.constants';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'password123';
const DAY_MS = 24 * 60 * 60 * 1000;
const CARDS_PER_BOARD = 20;
const COLUMN_DISTRIBUTION = [8, 7, 5] as const;
const ALL_PRIORITIES: Priority[] = [Priority.low, Priority.medium, Priority.high, Priority.urgent];

interface SeedUser {
  key: string;
  email: string;
  name: string;
}

interface SeedBoard {
  key: string;
  title: string;
}

interface SeedColumn {
  key: string;
  title: string;
  isDone: boolean;
}

interface SeedLabel {
  key: string;
  name: string;
  color: string;
}

const USERS: SeedUser[] = [
  { key: 'alice', email: 'alice@example.com', name: 'Алиса Иванова' },
  { key: 'bob', email: 'bob@example.com', name: 'Боб Петров' },
];

const BOARDS: SeedBoard[] = [
  { key: 'personal', title: 'Личное' },
  { key: 'work', title: 'Работа' },
  { key: 'study', title: 'Учёба' },
];

const COLUMNS: SeedColumn[] = [
  { key: 'todo', title: 'To Do', isDone: false },
  { key: 'in-progress', title: 'In Progress', isDone: false },
  { key: 'done', title: 'Done', isDone: true },
];

const LABELS: SeedLabel[] = [
  { key: 'bug', name: 'баг', color: '#ef4444' },
  { key: 'feature', name: 'фича', color: '#3b82f6' },
  { key: 'docs', name: 'документация', color: '#10b981' },
  { key: 'urgent', name: 'срочно', color: '#f59e0b' },
  { key: 'idea', name: 'идея', color: '#8b5cf6' },
];

const CARD_TITLES = [
  'Подготовить квартальный отчёт',
  'Обновить зависимости проекта',
  'Описать эндпоинты в Swagger',
  'Починить падение на логине',
  'Настроить CI/CD пайплайн',
  'Провести код-ревью PR #142',
  'Сверстать страницу настроек',
  'Оптимизировать запросы к базе',
  'Добавить фильтр по меткам',
  'Разобрать инцидент на проде',
  'Спланировать спринт',
  'Обновить дизайн-макеты',
  'Написать e2e-тесты',
  'Починить адаптивную вёрстку',
  'Подготовить демо для клиента',
  'Изучить новую библиотеку',
  'Сделать рефакторинг сервиса',
  'Добавить экспорт в CSV',
  'Настроить мониторинг ошибок',
  'Проверить безопасность зависимостей',
  'Составить смету на квартал',
  'Согласовать отпуск с командой',
  'Пройти курс по TypeScript',
  'Написать конспект лекции',
  'Подготовиться к экзамену',
  'Собрать обратную связь от команды',
  'Обновить roadmap продукта',
  'Почистить бэклог задач',
  'Настроить локальное окружение',
  'Разобраться с утечкой памяти',
];

const CARD_DESCRIPTIONS = [
  '## Контекст\n\nОписание задачи и шаги выполнения:\n\n- [ ] уточнить требования\n- [ ] реализовать\n- [ ] покрыть тестами',
  'Нужно проверить edge-кейсы и договориться о приоритете с командой.',
  '### Детали\n\nОсновные шаги уже согласованы, осталось оценить трудозатраты.',
  'Проблема воспроизводится не всегда, нужно собрать логи и метрики.',
  '**Важно:** не ломать обратную совместимость API.',
  'Разбить на подзадачи и назначить ответственных.',
  'Документация: обновить README и CHANGELOG после завершения.',
  'Проверить на мобильных разрешениях и в тёмной теме.',
];

const COMMENT_TEXTS = [
  'Взял в работу, вернусь с результатом к концу дня.',
  'Есть блокер: не хватает доступов к стенду.',
  'Готово, проверьте, пожалуйста.',
  'Добавил детали в описание задачи.',
  'Обсудим на ближайшем дейли.',
  'Поправил замечания из ревью.',
  'Нужна помощь с e2e-тестами.',
  'Перенёс дедлайн на следующую неделю.',
  'Согласовано с продуктом, можно двигаться дальше.',
  'Проверил на проде, всё стабильно.',
];

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: readonly T[], index: number): T {
  const safeIndex = ((index % items.length) + items.length) % items.length;
  const item = items[safeIndex];
  if (item === undefined) {
    throw new Error('Cannot pick from an empty list');
  }
  return item;
}

function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function columnIndexFor(cardIndex: number): number {
  let boundary = 0;
  for (const [index, count] of COLUMN_DISTRIBUTION.entries()) {
    boundary += count;
    if (cardIndex < boundary) {
      return index;
    }
  }
  return COLUMN_DISTRIBUTION.length - 1;
}

const userId = (key: string): string => `seed-user-${key}`;
const boardId = (userKey: string, boardKey: string): string => `seed-board-${userKey}-${boardKey}`;
const columnId = (board: string, columnKey: string): string => `seed-column-${board}-${columnKey}`;
const labelId = (board: string, labelKey: string): string => `seed-label-${board}-${labelKey}`;
const cardId = (board: string, index: number): string => `seed-card-${board}-${index}`;
const commentId = (card: string, index: number): string => `seed-comment-${card}-${index}`;

async function seedUser(user: SeedUser, userIndex: number, now: number, passwordHash: string) {
  const createdAt = new Date(now - (200 - userIndex * 40) * DAY_MS);

  const owner = await prisma.user.upsert({
    where: { email: user.email },
    update: {},
    create: {
      id: userId(user.key),
      email: user.email,
      name: user.name,
      password: passwordHash,
      createdAt,
      updatedAt: createdAt,
    },
  });

  for (const [boardIndex, board] of BOARDS.entries()) {
    await seedBoard(owner.id, user, board, userIndex, boardIndex, now);
  }
}

async function seedBoard(
  ownerId: string,
  user: SeedUser,
  board: SeedBoard,
  userIndex: number,
  boardIndex: number,
  now: number,
) {
  const bId = boardId(user.key, board.key);
  const boardRank = userIndex * BOARDS.length + boardIndex;
  const boardCreatedAt = new Date(now - (120 - boardRank * 12) * DAY_MS);

  await prisma.board.upsert({
    where: { id: bId },
    update: {},
    create: {
      id: bId,
      title: board.title,
      ownerId,
      createdAt: boardCreatedAt,
      updatedAt: boardCreatedAt,
    },
  });

  for (const [columnIndex, column] of COLUMNS.entries()) {
    await prisma.column.upsert({
      where: { boardId_order: { boardId: bId, order: columnIndex } },
      update: {},
      create: {
        id: columnId(bId, column.key),
        title: column.title,
        isDone: column.isDone,
        order: columnIndex,
        boardId: bId,
        createdAt: boardCreatedAt,
        updatedAt: boardCreatedAt,
      },
    });
  }

  for (const label of LABELS) {
    await prisma.label.upsert({
      where: { boardId_name: { boardId: bId, name: label.name } },
      update: {},
      create: {
        id: labelId(bId, label.key),
        name: label.name,
        color: label.color,
        boardId: bId,
      },
    });
  }

  const rng = mulberry32(hashSeed(bId));
  const ordersInColumn = [0, 0, 0];

  for (let cardIndex = 0; cardIndex < CARDS_PER_BOARD; cardIndex += 1) {
    const columnIndex = columnIndexFor(cardIndex);
    const column = pick(COLUMNS, columnIndex);
    const cId = cardId(bId, cardIndex);
    const order = ordersInColumn[columnIndex] ?? 0;
    ordersInColumn[columnIndex] = order + 1;
    const priority = pick(ALL_PRIORITIES, boardRank * 3 + cardIndex);
    const cardCreatedAt = new Date(now - randInt(rng, 10, 90) * DAY_MS);
    const cardUpdatedAt = new Date(cardCreatedAt.getTime() + randInt(rng, 0, 5) * DAY_MS);

    let deadline: Date | null = null;
    if (rng() < 0.6) {
      const offsetDays = rng() < 0.4 ? -randInt(rng, 1, 20) : randInt(rng, 1, 45);
      deadline = new Date(now + offsetDays * DAY_MS);
    }

    await prisma.card.upsert({
      where: { id: cId },
      update: {},
      create: {
        id: cId,
        title: pick(CARD_TITLES, boardRank * 7 + cardIndex),
        description: rng() < 0.7 ? pick(CARD_DESCRIPTIONS, cardIndex) : null,
        priority,
        deadline,
        order,
        columnId: columnId(bId, column.key),
        assigneeId: ownerId,
        createdAt: cardCreatedAt,
        updatedAt: cardUpdatedAt,
      },
    });

    if (rng() < 0.7) {
      const labelStart = Math.floor(rng() * LABELS.length);
      const labelCount = randInt(rng, 1, 2);
      for (let labelOffset = 0; labelOffset < labelCount; labelOffset += 1) {
        const label = pick(LABELS, labelStart + labelOffset);
        await prisma.cardLabel.upsert({
          where: { cardId_labelId: { cardId: cId, labelId: labelId(bId, label.key) } },
          update: {},
          create: { cardId: cId, labelId: labelId(bId, label.key) },
        });
      }
    }

    const commentCount = randInt(rng, 1, 3);
    for (let commentIndex = 0; commentIndex < commentCount; commentIndex += 1) {
      const commentCreatedAt = new Date(cardCreatedAt.getTime() + (commentIndex + 1) * DAY_MS);
      await prisma.comment.upsert({
        where: { id: commentId(cId, commentIndex) },
        update: {},
        create: {
          id: commentId(cId, commentIndex),
          content: pick(COMMENT_TEXTS, cardIndex + commentIndex),
          cardId: cId,
          authorId: ownerId,
          createdAt: commentCreatedAt,
          updatedAt: commentCreatedAt,
        },
      });
    }
  }
}

async function main(): Promise<void> {
  const now = Date.now();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  for (const [userIndex, user] of USERS.entries()) {
    await seedUser(user, userIndex, now, passwordHash);
  }

  const [users, boards, cards, columns, labels, comments] = await Promise.all([
    prisma.user.count(),
    prisma.board.count(),
    prisma.card.count(),
    prisma.column.count(),
    prisma.label.count(),
    prisma.comment.count(),
  ]);

  console.log(
    `Seed complete: users=${users}, boards=${boards}, columns=${columns}, ` +
      `cards=${cards}, labels=${labels}, comments=${comments}`,
  );
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
