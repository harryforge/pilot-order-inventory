const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' });
const dateTime = new Intl.DateTimeFormat('ja-JP', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Tokyo',
});

/** Formats whole yen, for example `￥1,280`. */
export function formatYen(amount: number): string {
  return yen.format(amount);
}

/** Formats an ISO timestamp in Japan time. */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}
