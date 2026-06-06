import { describe, expect, it } from 'vitest';
import { errorMessage } from './errors';

describe('errorMessage', () => {
  it('returns the message from an Error instance', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns the message from a Supabase plain-object error', () => {
    expect(errorMessage({ message: 'duplicate key value', code: '23505' })).toBe('duplicate key value');
  });

  it('maps undefined_table (42P01) to a migration hint', () => {
    const msg = errorMessage({ message: 'relation "income_sources" does not exist', code: '42P01' });
    expect(msg).toContain('not set up in the database');
    expect(msg).toContain('schema.sql');
  });

  it('maps insufficient_privilege (42501) to an RLS hint', () => {
    const msg = errorMessage({ message: 'permission denied', code: '42501' });
    expect(msg).toContain('permission denied');
    expect(msg).toContain('RLS');
  });

  it('falls back to details when message is absent', () => {
    expect(errorMessage({ details: 'something specific' })).toBe('something specific');
  });

  it('uses the provided fallback for an empty Error', () => {
    expect(errorMessage(new Error(''), 'Save failed')).toBe('Save failed');
  });

  it('uses the provided fallback for null/undefined/non-object', () => {
    expect(errorMessage(null, 'Save failed')).toBe('Save failed');
    expect(errorMessage(undefined, 'Save failed')).toBe('Save failed');
    expect(errorMessage('a string', 'Save failed')).toBe('Save failed');
  });
});
