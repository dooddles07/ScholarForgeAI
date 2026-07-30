/* Relative time for anything recent: "3 days ago" is easier to process than a date. */

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 1000 * 60 * 60 * 24 * 365],
  ['month', 1000 * 60 * 60 * 24 * 30],
  ['day', 1000 * 60 * 60 * 24],
  ['hour', 1000 * 60 * 60],
  ['minute', 1000 * 60],
];

export function relativeTime(epochMs: number): string {
  const diff = epochMs - Date.now();
  const abs = Math.abs(diff);

  if (abs < 1000 * 60) return 'just now';

  for (const [unit, ms] of UNITS) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return 'just now';
}

export function duration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) return `${Math.round(ms / 1000)} sec`;
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

/* Interval hints on rating buttons. Short forms, because they sit on a 56px control. */
export function intervalLabel(days: number): string {
  if (days < 1) return `${Math.max(1, Math.round(days * 24 * 60))} min`;
  if (days === 1) return 'tomorrow';
  if (days < 30) return `${Math.round(days)} days`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  return `${(days / 365).toFixed(1)} years`;
}
