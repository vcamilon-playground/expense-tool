import { describe, expect, it } from 'vitest';
import { brandColor, brandDomain, brandHue, brandInitials, brandLabelFromText, brandsForType, faviconUrl } from './brand-logos';

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

describe('brandsForType', () => {
  it('returns only brands of the requested type, alphabetised', () => {
    const banks = brandsForType('bank');
    expect(banks.every((b) => b.type === 'bank')).toBe(true);
    expect(banks.map((b) => b.label)).toContain('BPI');
    const labels = banks.map((b) => b.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));

    const wallets = brandsForType('ewallet');
    expect(wallets.every((b) => b.type === 'ewallet')).toBe(true);
    expect(wallets.map((b) => b.label)).toContain('GCash');
  });
});

describe('brandLabelFromText', () => {
  it('resolves a canonical label from an exact name or substring', () => {
    expect(brandLabelFromText('GCash')).toBe('GCash');
    expect(brandLabelFromText('BPI Savings')).toBe('BPI');
    expect(brandLabelFromText('Maya Bank')).toBe('Maya Bank');
  });
  it('returns null for unknown or empty text', () => {
    expect(brandLabelFromText('Rural Bank of Cebu')).toBeNull();
    expect(brandLabelFromText('')).toBeNull();
    expect(brandLabelFromText(null)).toBeNull();
  });
});

describe('brandColor', () => {
  it('uses the brand color when defined', () => {
    expect(brandColor('BDO Savings')).toBe('#00256c');
    expect(brandColor('SeaBank')).toBe('#ee4d2d');
  });
  it('falls back to a hashed hue for brands/names without a color', () => {
    expect(brandColor('Rural Bank of Cebu')).toMatch(/^hsl\(\d+ 52% 42%\)$/);
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
