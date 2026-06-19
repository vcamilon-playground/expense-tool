// Maps a free-text income-source name to a known brand domain so we can show
// the brand's real logo. Ordered list: the first substring match wins, so more
// specific keywords must precede generic ones (e.g. "paymaya" before "maya").
const BRAND_DOMAINS: ReadonlyArray<readonly [match: string, domain: string]> = [
  // E-wallets
  ['gcash', 'gcash.com'],
  ['paymaya', 'maya.ph'],
  ['maya bank', 'maya.ph'],
  ['grabpay', 'grab.com'],
  ['grab', 'grab.com'],
  ['shopeepay', 'shopee.ph'],
  ['shopee', 'shopee.ph'],
  ['coins.ph', 'coins.ph'],
  ['coins', 'coins.ph'],
  ['paypal', 'paypal.com'],
  ['lazada', 'lazada.com.ph'],
  ['wechat', 'wechat.com'],
  ['alipay', 'alipay.com'],
  // Banks
  ['bdo', 'bdo.com.ph'],
  ['bpi', 'bpi.com.ph'],
  ['metrobank', 'metrobank.com.ph'],
  ['unionbank', 'unionbankph.com'],
  ['union bank', 'unionbankph.com'],
  ['landbank', 'landbank.com'],
  ['security bank', 'securitybank.com'],
  ['securitybank', 'securitybank.com'],
  ['chinabank', 'chinabank.ph'],
  ['china bank', 'chinabank.ph'],
  ['eastwest', 'eastwestbanker.com'],
  ['psbank', 'psbank.com.ph'],
  ['maybank', 'maybank.com.ph'],
  ['rcbc', 'rcbc.com'],
  ['pnb', 'pnb.com.ph'],
  ['dbp', 'dbp.ph'],
  ['gotyme', 'gotyme.com.ph'],
  ['tonik', 'tonikbank.com'],
  ['seabank', 'seabank.ph'],
  ['cimb', 'cimbbank.com.ph'],
  ['hsbc', 'hsbc.com.ph'],
  ['citibank', 'citibank.com.ph'],
  // Generic "maya" last so "paymaya" / "maya bank" resolve first.
  ['maya', 'maya.ph'],
];

export function brandDomain(name: string | null | undefined): string | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  for (const [match, domain] of BRAND_DOMAINS) {
    if (lower.includes(match)) return domain;
  }
  return null;
}

export function faviconUrl(domain: string, size = 64): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

// Up to two initials for the fallback badge ("BPI Savings" → "BP", "GCash" → "GC").
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

// Deterministic hue (0–359) from the name for the fallback badge background.
export function brandHue(name: string | null | undefined): number {
  const s = name ?? '';
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) % 360;
  return hash;
}
