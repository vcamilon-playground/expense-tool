'use client';

import { useState } from 'react';
import { brandDomain, brandHue, brandInitials, faviconUrl } from '@/lib/brand-logos';

// A small brand mark for an income source. Shows the brand's real favicon when
// the name maps to a known domain and the image loads; otherwise falls back to
// a colored initial badge (offline, unknown names, or a failed fetch).
export default function BrandLogo({ name, size = 24 }: { name: string | null; size?: number }) {
  const [errored, setErrored] = useState(false);
  const domain = brandDomain(name);

  if (domain && !errored) {
    return (
      <img
        src={faviconUrl(domain, 64)}
        alt=""
        width={size}
        height={size}
        className="brand-logo"
        loading="lazy"
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <span
      className="brand-logo brand-logo-badge"
      aria-hidden="true"
      style={{ width: size, height: size, background: `hsl(${brandHue(name)} 52% 42%)`, fontSize: Math.round(size * 0.42) }}
    >
      {brandInitials(name)}
    </span>
  );
}
