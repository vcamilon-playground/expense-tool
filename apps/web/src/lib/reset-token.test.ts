import { describe, expect, it } from 'vitest';
import { generateResetToken, hashResetToken, RESET_TOKEN_TTL_MS } from './reset-token';

describe('generateResetToken', () => {
  it('returns a 64-char hex string (32 random bytes)', () => {
    const token = generateResetToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is unpredictable across calls', () => {
    expect(generateResetToken()).not.toBe(generateResetToken());
  });
});

describe('hashResetToken', () => {
  it('is deterministic for the same input', () => {
    const token = 'abc123';
    expect(hashResetToken(token)).toBe(hashResetToken(token));
  });

  it('produces a 64-char sha-256 hex digest', () => {
    expect(hashResetToken('abc123')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('differs for different inputs', () => {
    expect(hashResetToken('a')).not.toBe(hashResetToken('b'));
  });

  it('never returns the raw token (so a DB leak is not directly usable)', () => {
    const token = generateResetToken();
    expect(hashResetToken(token)).not.toBe(token);
  });
});

describe('RESET_TOKEN_TTL_MS', () => {
  it('is one hour', () => {
    expect(RESET_TOKEN_TTL_MS).toBe(60 * 60 * 1000);
  });
});
