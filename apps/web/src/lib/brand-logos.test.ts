import { describe, expect, it } from 'vitest';
import { brandDomain, brandHue, brandInitials, faviconUrl } from './brand-logos';

describe('brandDomain', () => {
  it('matches common banks and e-wallets case-insensitively', () => {
    expect(brandDomain('BPI Savings')).toBe('bpi.com.ph');
    expect(brandDomain('gcash')).toBe('gcash.com');
    expect(brandDomain('BDO Checking')).toBe('bdo.com.ph');
    expect(brandDomain('My UnionBank account')).toBe('unionbankph.com');
  });

  it('prefers the more specific keyword (paymaya/maya bank before generic maya)', () => {
    expect(brandDomain('PayMaya')).toBe('maya.ph');
    expect(brandDomain('Maya Bank')).toBe('maya.ph');
    expect(brandDomain('Maya')).toBe('maya.ph');
  });

  it('does not false-match "Savings" to ING', () => {
    expect(brandDomain('My Savings Jar')).toBeNull();
  });

  it('returns null for unknown names and empty input', () => {
    expect(brandDomain('Neighborhood Credit Union')).toBeNull();
    expect(brandDomain('')).toBeNull();
    expect(brandDomain(null)).toBeNull();
    expect(brandDomain(undefined)).toBeNull();
  });
});

describe('brandInitials', () => {
  it('uses the first letter of the first two words', () => {
    expect(brandInitials('BPI Savings')).toBe('BS');
    expect(brandInitials('Security Bank')).toBe('SB');
  });
  it('uses the first two letters of a single word', () => {
    expect(brandInitials('GCash')).toBe('GC');
  });
  it('handles single-letter and empty names', () => {
    expect(brandInitials('A')).toBe('A');
    expect(brandInitials('')).toBe('?');
    expect(brandInitials(null)).toBe('?');
  });
});

describe('faviconUrl', () => {
  it('builds a sized favicon URL for the domain', () => {
    expect(faviconUrl('bpi.com.ph', 64)).toBe('https://www.google.com/s2/favicons?domain=bpi.com.ph&sz=64');
  });
});

describe('brandHue', () => {
  it('is deterministic and within 0–359', () => {
    const h = brandHue('GCash');
    expect(h).toBe(brandHue('GCash'));
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(360);
  });
});
