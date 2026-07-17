'use client';

const BARS = Array.from({ length: 12 });

/** Themed 12-bar ring spinner (color follows the active theme accent). */
export function Spinner() {
  return (
    <div className="spinner" data-testid="spinner" aria-hidden="true">
      {BARS.map((_, i) => (
        <div key={i} style={{ transform: `rotate(${i * 30}deg)`, animationDelay: `${-1.1 + i * 0.1}s` }} />
      ))}
    </div>
  );
}

/**
 * Small inline spinner for buttons and inline loading states. Inherits the text
 * colour of its context via `currentColor`, so it stays legible on solid accent
 * buttons (white text) as well as ghost/plain buttons.
 */
export function InlineSpinner() {
  return <span className="btn-spinner" aria-hidden="true" />;
}

/** Full-height centered loading state with the themed spinner and a label. */
export default function LoadingScreen({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="loading-screen" data-testid="loading-screen" role="status" aria-label={label}>
      <Spinner />
      <p className="loading-label" data-testid="loading-label">{label}</p>
    </div>
  );
}
