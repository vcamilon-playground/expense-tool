const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Formats a date as `Today is yyyy/mm/dd, DDD` (DDD = 3-letter weekday). */
export function formatToday(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `Today is ${year}/${month}/${day}, ${WEEKDAYS[date.getDay()]}`;
}
