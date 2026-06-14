import { describe, expect, it } from 'vitest';
import { isValidEmail, normalizeEmail, looksLikeEmail } from './auth';

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Jane.Doe@Example.COM ')).toBe('jane.doe@example.com');
  });
});

describe('isValidEmail', () => {
  it('accepts a typical address', () => {
    expect(isValidEmail('jane@example.com')).toBe(true);
  });

  it('accepts upper-case and surrounding spaces (normalized first)', () => {
    expect(isValidEmail('  JANE@EXAMPLE.COM ')).toBe(true);
  });

  it('rejects a missing @', () => {
    expect(isValidEmail('janeexample.com')).toBe(false);
  });

  it('rejects a missing domain dot', () => {
    expect(isValidEmail('jane@example')).toBe(false);
  });

  it('rejects internal whitespace', () => {
    expect(isValidEmail('ja ne@example.com')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects an over-long address', () => {
    expect(isValidEmail(`${'a'.repeat(250)}@example.com`)).toBe(false);
  });
});

describe('looksLikeEmail', () => {
  it('is true when an @ is present', () => {
    expect(looksLikeEmail('jane@example.com')).toBe(true);
  });

  it('is false for a bare username', () => {
    expect(looksLikeEmail('jane_doe')).toBe(false);
  });
});
