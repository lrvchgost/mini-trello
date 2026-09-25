export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002'
  );
}

const WRITE_CONFLICT_PRISMA_CODES = new Set(['P2034']);
const WRITE_CONFLICT_PG_CODES = new Set(['40001', '40P01']);

/**
 * Конфликт параллельной записи: дедлок PostgreSQL (40P01) либо
 * serialization/abstraction failure (40001). Prisma оборачивает оба случая
 * в P2034; raw-запросы отдают код PostgreSQL напрямую в `error.code`
 * или в `error.meta.code` (P2010).
 */
export function isWriteConflictError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string' && WRITE_CONFLICT_PRISMA_CODES.has(code)) {
    return true;
  }
  if (typeof code === 'string' && WRITE_CONFLICT_PG_CODES.has(code)) {
    return true;
  }

  const metaCode = (error as { meta?: { code?: unknown } }).meta?.code;
  return typeof metaCode === 'string' && WRITE_CONFLICT_PG_CODES.has(metaCode);
}
