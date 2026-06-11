import { describe, expect, it } from 'vitest';
import { STALE_AFTER_MS, shouldRefreshOnResume } from './data-refresh';

describe('shouldRefreshOnResume', () => {
  const now = 1_000_000_000;

  it('does not refresh when the app was never hidden', () => {
    expect(shouldRefreshOnResume(null, now)).toBe(false);
  });

  it('does not refresh after a brief background period', () => {
    const hiddenAt = now - (STALE_AFTER_MS - 1);
    expect(shouldRefreshOnResume(hiddenAt, now)).toBe(false);
  });

  it('refreshes exactly at the staleness threshold', () => {
    const hiddenAt = now - STALE_AFTER_MS;
    expect(shouldRefreshOnResume(hiddenAt, now)).toBe(true);
  });

  it('refreshes after a long background period', () => {
    const hiddenAt = now - 60 * 60 * 1000;
    expect(shouldRefreshOnResume(hiddenAt, now)).toBe(true);
  });

  it('respects a custom threshold', () => {
    const hiddenAt = now - 10_000;
    expect(shouldRefreshOnResume(hiddenAt, now, 5_000)).toBe(true);
    expect(shouldRefreshOnResume(hiddenAt, now, 20_000)).toBe(false);
  });
});
