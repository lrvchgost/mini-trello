import { isUniqueConstraintError, isWriteConflictError } from './prisma-errors';

describe('isUniqueConstraintError', () => {
  it('detects P2002', () => {
    expect(isUniqueConstraintError({ code: 'P2002' })).toBe(true);
  });

  it('rejects other codes and non-objects', () => {
    expect(isUniqueConstraintError({ code: 'P2034' })).toBe(false);
    expect(isUniqueConstraintError(null)).toBe(false);
    expect(isUniqueConstraintError('P2002')).toBe(false);
  });
});

describe('isWriteConflictError', () => {
  it('detects Prisma P2034 (write conflict or deadlock)', () => {
    expect(isWriteConflictError({ code: 'P2034' })).toBe(true);
  });

  it('detects raw PostgreSQL deadlock and serialization codes', () => {
    expect(isWriteConflictError({ code: '40P01' })).toBe(true);
    expect(isWriteConflictError({ code: '40001' })).toBe(true);
  });

  it('detects a PostgreSQL code inside Prisma meta (P2010 wrapper)', () => {
    expect(isWriteConflictError({ code: 'P2010', meta: { code: '40P01' } })).toBe(true);
    expect(isWriteConflictError({ code: 'P2010', meta: { code: '40001' } })).toBe(true);
  });

  it('rejects unrelated errors', () => {
    expect(isWriteConflictError({ code: 'P2002' })).toBe(false);
    expect(isWriteConflictError({ code: 'P2010', meta: { code: '23505' } })).toBe(false);
    expect(isWriteConflictError(new Error('boom'))).toBe(false);
    expect(isWriteConflictError(null)).toBe(false);
    expect(isWriteConflictError(undefined)).toBe(false);
    expect(isWriteConflictError(42)).toBe(false);
  });
});
