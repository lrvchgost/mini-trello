import type { PrismaService } from '../../src/prisma/prisma.service';

/**
 * Очистка состояния между интеграционными тестами: truncate всех таблиц
 * приложения. Служебную таблицу Prisma (`_prisma_migrations`) не трогаем.
 */
export async function truncateAllTables(prisma: PrismaService): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;

  const tables = rows.map((row) => row.tablename).filter((name) => !name.startsWith('_prisma'));
  if (tables.length === 0) {
    return;
  }

  const list = tables.map((name) => `"public"."${name}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
