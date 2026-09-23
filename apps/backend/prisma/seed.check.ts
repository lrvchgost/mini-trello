import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Priority, PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

const rootEnv = resolve(__dirname, '../../../.env');
if (existsSync(rootEnv)) {
  config({ path: rootEnv });
}

const prisma = new PrismaClient();

const EXPECTED = {
  users: 2,
  boards: 6,
  columns: 18,
  cards: 120,
} as const;

const ALL_PRIORITIES: Priority[] = [Priority.low, Priority.medium, Priority.high, Priority.urgent];

const failures: string[] = [];

function checkEqual(name: string, actual: number, expected: number): void {
  const ok = actual === expected;
  console.log(`${ok ? '✓' : '✗'} ${name}: ${actual}${ok ? '' : ` (expected ${expected})`}`);
  if (!ok) {
    failures.push(name);
  }
}

function checkTrue(name: string, condition: boolean, detail = ''): void {
  console.log(`${condition ? '✓' : '✗'} ${name}${detail ? `: ${detail}` : ''}`);
  if (!condition) {
    failures.push(name);
  }
}

async function main(): Promise<void> {
  const [users, boards, columns, cards, comments, labels] = await Promise.all([
    prisma.user.count(),
    prisma.board.count(),
    prisma.column.count(),
    prisma.card.count(),
    prisma.comment.count(),
    prisma.label.count(),
  ]);

  checkEqual('users', users, EXPECTED.users);
  checkEqual('boards', boards, EXPECTED.boards);
  checkEqual('columns', columns, EXPECTED.columns);
  checkEqual('cards', cards, EXPECTED.cards);

  const priorityGroups = await prisma.card.groupBy({ by: ['priority'], _count: { _all: true } });
  const presentPriorities = new Set(priorityGroups.map((group) => group.priority));
  const hasAllPriorities = ALL_PRIORITIES.every((priority) => presentPriorities.has(priority));
  checkTrue('all priorities present', hasAllPriorities, [...presentPriorities].sort().join(', '));

  const overdue = await prisma.card.count({
    where: { deadline: { lt: new Date() }, column: { isDone: false } },
  });
  checkTrue('overdue cards present', overdue > 0, String(overdue));

  checkTrue('comments present', comments >= cards, `${comments} for ${cards} cards`);
  checkTrue('labels present', labels > 0, String(labels));

  const boardColumns = await prisma.board.findMany({
    select: { id: true, _count: { select: { columns: true } } },
  });
  const boardsWithThreeColumns = boardColumns.filter((board) => board._count.columns === 3).length;
  checkTrue(
    'each board has 3 columns',
    boardsWithThreeColumns === boards,
    `${boardsWithThreeColumns}/${boards}`,
  );

  const cardsWithLabels = await prisma.card.count({ where: { labels: { some: {} } } });
  checkTrue('cards with labels present', cardsWithLabels > 0, String(cardsWithLabels));

  const cardsWithComments = await prisma.card.count({ where: { comments: { some: {} } } });
  checkTrue('cards with comments', cardsWithComments === cards, `${cardsWithComments}/${cards}`);

  const cardsWithAssignee = await prisma.card.count({ where: { assigneeId: { not: null } } });
  checkTrue('all cards assigned', cardsWithAssignee === cards, `${cardsWithAssignee}/${cards}`);

  if (failures.length > 0) {
    throw new Error(`Seed smoke check failed: ${failures.join(', ')}`);
  }

  console.log(
    `Seed smoke check passed: ${EXPECTED.users} / ${EXPECTED.boards} / ${EXPECTED.cards}`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
