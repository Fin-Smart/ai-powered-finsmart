const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const DAY = 24 * 60 * 60 * 1000;

/** Compact relative timestamp: time today, "Yesterday", weekday this week, otherwise a short date. */
export function formatWhen(timestamp: number) {
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  if (timestamp >= startOfToday) return timeFormat.format(timestamp);
  if (timestamp >= startOfToday - DAY) return 'Yesterday';
  if (timestamp >= startOfToday - 6 * DAY) return weekdayFormat.format(timestamp);
  return dateFormat.format(timestamp);
}
