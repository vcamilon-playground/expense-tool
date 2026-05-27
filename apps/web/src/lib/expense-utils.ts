export function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function monthLabel(key: string): string {
  const parts = key.split('-');
  return new Date(parseInt(parts[0]!), parseInt(parts[1]!) - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateShort(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('default', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
