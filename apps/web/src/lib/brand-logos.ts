export type BrandType = 'bank' | 'ewallet';

export type Brand = {
  label: string; // canonical name stored in income_sources.brand and shown in the dropdown
  domain: string; // used to fetch the favicon
  type: BrandType;
  match: string[]; // lowercase substrings that resolve free text to this brand
  color?: string; // badge background when the favicon is unavailable (else a hashed hue)
};

// Known PH (and a few global) banks and e-wallets. Order matters for substring
// matching: more specific keywords must precede generic ones, and banks precede
// e-wallets so "Maya Bank" resolves to the bank, not the Maya wallet.
export const BRANDS: ReadonlyArray<Brand> = [
  // Banks
  { label: 'BDO', domain: 'bdo.com.ph', type: 'bank', match: ['bdo'], color: '#00256c' },
  { label: 'BPI', domain: 'bpi.com.ph', type: 'bank', match: ['bpi'] },
  { label: 'Metrobank', domain: 'metrobank.com.ph', type: 'bank', match: ['metrobank'] },
  { label: 'UnionBank', domain: 'unionbankph.com', type: 'bank', match: ['unionbank', 'union bank'] },
  { label: 'Landbank', domain: 'landbank.com', type: 'bank', match: ['landbank'] },
  { label: 'Security Bank', domain: 'securitybank.com', type: 'bank', match: ['security bank', 'securitybank'] },
  { label: 'China Bank', domain: 'chinabank.ph', type: 'bank', match: ['chinabank', 'china bank'] },
  { label: 'EastWest Bank', domain: 'eastwestbanker.com', type: 'bank', match: ['eastwest'] },
  { label: 'PSBank', domain: 'psbank.com.ph', type: 'bank', match: ['psbank'] },
  { label: 'Maybank', domain: 'maybank.com.ph', type: 'bank', match: ['maybank'] },
  { label: 'RCBC', domain: 'rcbc.com', type: 'bank', match: ['rcbc'] },
  { label: 'PNB', domain: 'pnb.com.ph', type: 'bank', match: ['pnb'] },
  { label: 'DBP', domain: 'www.dbp.ph', type: 'bank', match: ['dbp'] },
  { label: 'GoTyme', domain: 'gotyme.com.ph', type: 'bank', match: ['gotyme'] },
  { label: 'Tonik', domain: 'tonikbank.com', type: 'bank', match: ['tonik'] },
  { label: 'SeaBank', domain: 'seabank.ph', type: 'bank', match: ['seabank'], color: '#ee4d2d' },
  { label: 'CIMB', domain: 'cimbbank.com.ph', type: 'bank', match: ['cimb'] },
  { label: 'HSBC', domain: 'hsbc.com.ph', type: 'bank', match: ['hsbc'] },
  { label: 'Citibank', domain: 'citibank.com.ph', type: 'bank', match: ['citibank'] },
  { label: 'Maya Bank', domain: 'maya.ph', type: 'bank', match: ['maya bank'] },
  // E-wallets
  { label: 'GCash', domain: 'gcash.com', type: 'ewallet', match: ['gcash'] },
  { label: 'Maya', domain: 'maya.ph', type: 'ewallet', match: ['paymaya', 'maya'] },
  { label: 'GrabPay', domain: 'grab.com', type: 'ewallet', match: ['grabpay', 'grab'] },
  { label: 'ShopeePay', domain: 'shopee.ph', type: 'ewallet', match: ['shopeepay', 'shopee'] },
  { label: 'Coins.ph', domain: 'coins.ph', type: 'ewallet', match: ['coins.ph', 'coins'] },
  { label: 'PayPal', domain: 'paypal.com', type: 'ewallet', match: ['paypal'] },
  { label: 'Lazada Wallet', domain: 'lazada.com.ph', type: 'ewallet', match: ['lazada'] },
];

/** Known brands of a given type, alphabetised for the dropdown. */
export function brandsForType(type: BrandType): Brand[] {
  return BRANDS.filter((b) => b.type === type).slice().sort((a, b) => a.label.localeCompare(b.label));
}

/** The brand whose canonical label or match keyword fits the text, else null. */
function brandFor(text: string | null | undefined): Brand | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  const exact = BRANDS.find((b) => b.label.toLowerCase() === lower);
  if (exact) return exact;
  return BRANDS.find((b) => b.match.some((m) => lower.includes(m))) ?? null;
}

/** Canonical brand label for free text (e.g. legacy names), else null. */
export function brandLabelFromText(text: string | null | undefined): string | null {
  return brandFor(text)?.label ?? null;
}

export function brandDomain(value: string | null | undefined): string | null {
  return brandFor(value)?.domain ?? null;
}

export function faviconUrl(domain: string, size = 64): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

/** Up to two initials for the fallback badge ("BPI Savings" → "BS", "GCash" → "GC"). */
export function brandInitials(name: string | null | undefined): string {
  const cleaned = (name ?? '').trim();
  if (!cleaned) return '?';
  const words = cleaned.split(/\s+/);
  if (words.length >= 2) {
    const first = words[0] ?? '';
    const second = words[1] ?? '';
    return (first.charAt(0) + second.charAt(0)).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

/** Deterministic hue (0–359) from the name for the fallback badge background. */
export function brandHue(name: string | null | undefined): number {
  const s = name ?? '';
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) % 360;
  return hash;
}

/** Fallback badge background: the brand's color when known, else a hashed hue. */
export function brandColor(name: string | null | undefined): string {
  const brand = brandFor(name);
  return brand?.color ?? `hsl(${brandHue(name)} 52% 42%)`;
}
