// How long the app may sit hidden (tab in background, PWA minimised, screen
// locked) before its data is considered stale and refetched on resume.
export const STALE_AFTER_MS = 5 * 60 * 1000;

// Decide whether returning to the app should trigger a data refresh. `hiddenAt`
// is the timestamp the document last became hidden, or null if it was never
// hidden during this mount. A resume only refreshes once the app has been away
// for at least `staleAfterMs` — brief tab switches do not refetch.
export function shouldRefreshOnResume(
  hiddenAt: number | null,
  now: number,
  staleAfterMs: number = STALE_AFTER_MS,
): boolean {
  if (hiddenAt === null) return false;
  return now - hiddenAt >= staleAfterMs;
}
