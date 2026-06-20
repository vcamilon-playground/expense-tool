'use client';

import { useEffect, useState } from 'react';
import { brandColor, brandDomain, brandInitials, faviconUrl } from '@/lib/brand-logos';

const FAVICON_SIZE = 64;
// Google's favicon service returns a 16×16 generic globe when it has no real
// icon for a domain (e.g. BDO, SeaBank). It loads successfully, so onError
// never fires — detect it by its size and fall back to the initial badge.
const GENERIC_GLOBE_MAX = 16;

// A small brand mark for an income source. Shows the brand's real favicon when
// the name maps to a known domain and a real icon loads; otherwise falls back
// to a colored initial badge (offline, unknown names, missing/placeholder icon).
export default function BrandLogo({ name, size = 24 }: { name: string | null; size?: number }) {
  const domain = brandDomain(name);
  const [failed, setFailed] = useState(false);

  // Reset when the source changes so a reused instance re-attempts its favicon.
  useEffect(() => setFailed(false), [domain]);

  if (domain && !failed) {
    return (
      <img
        src={faviconUrl(domain, FAVICON_SIZE)}
        alt=""
        width={size}
        height={size}
        className="brand-logo"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth > 0 && e.currentTarget.naturalWidth <= GENERIC_GLOBE_MAX) {
            setFailed(true);
          }
        }}
      />
    );
  }

  return (
    <span
      className="brand-logo brand-logo-badge"
      aria-hidden="true"
      style={{ width: size, height: size, background: brandColor(name), fontSize: Math.round(size * 0.42) }}
    >
      {brandInitials(name)}
    </span>
  );
}
