const DAY = 86_400_000;

/** ISO date (YYYY-MM-DD) n days from now. */
export function isoDateInDays(days: number): string {
  return new Date(Date.now() + days * DAY).toISOString().slice(0, 10);
}

/** Epoch milliseconds n days ago. */
export function msDaysAgo(days: number): number {
  return Date.now() - days * DAY;
}
