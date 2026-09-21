import { createHash, randomBytes } from 'node:crypto';

const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

export function parseDurationMs(value: string): number {
  const match = /^(\d+)([smhdw])$/.exec(value.trim()) ?? /^(\d+)$/.exec(value.trim());

  if (!match) {
    throw new Error(`Invalid duration value: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? 's';

  return amount * (UNIT_MS[unit] ?? UNIT_MS.s!);
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}
