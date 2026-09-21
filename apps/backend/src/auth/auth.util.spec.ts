import { generateRefreshToken, hashToken, parseDurationMs } from './auth.util';

describe('parseDurationMs', () => {
  it.each([
    ['15m', 900_000],
    ['7d', 604_800_000],
    ['60s', 60_000],
    ['2h', 7_200_000],
    ['1w', 604_800_000],
    ['30', 30_000],
  ])('parses %s', (input, expected) => {
    expect(parseDurationMs(input)).toBe(expected);
  });

  it('throws on invalid input', () => {
    expect(() => parseDurationMs('abc')).toThrow();
  });
});

describe('hashToken', () => {
  it('is deterministic sha-256 hex', () => {
    expect(hashToken('token')).toBe(hashToken('token'));
    expect(hashToken('token')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('generateRefreshToken', () => {
  it('produces unique values', () => {
    expect(generateRefreshToken()).not.toBe(generateRefreshToken());
  });
});
