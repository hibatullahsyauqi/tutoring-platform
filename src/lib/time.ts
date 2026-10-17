/**
 * The one time zone the app thinks in. Lessons, the timetable's days and weeks, and the payroll
 * month all follow it, so the result no longer depends on where the server runs or which zone the
 * browser is in. Override with NEXT_PUBLIC_APP_TIME_ZONE (an IANA name such as "Asia/Makassar").
 */
export const APP_TIME_ZONE = process.env.NEXT_PUBLIC_APP_TIME_ZONE || 'Asia/Jakarta';

const ZONE_LABELS: Record<string, string> = {
  'Asia/Jakarta': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Jayapura': 'WIT',
};

/** Short name shown next to times, e.g. "WIB". */
export function zoneLabel(tz: string = APP_TIME_ZONE): string {
  if (ZONE_LABELS[tz]) return ZONE_LABELS[tz];
  const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
    .formatToParts(new Date())
    .find((p) => p.type === 'timeZoneName');
  return part?.value ?? tz;
}

export type ZonedParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday
};

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string) {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'short',
    });
    formatters.set(tz, f);
  }
  return f;
}

/** The wall-clock fields of an instant in a zone. */
export function zonedParts(date: Date, tz: string = APP_TIME_ZONE): ZonedParts {
  const out: Record<string, string> = {};
  for (const p of formatter(tz).formatToParts(date)) out[p.type] = p.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
    second: Number(out.second),
    weekday: WEEKDAYS[out.weekday] ?? 0,
  };
}

/** Minutes the zone is ahead of UTC at that instant (+420 for Jakarta). */
export function zoneOffsetMinutes(date: Date, tz: string = APP_TIME_ZONE): number {
  const p = zonedParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** The instant at which the zone's wall clock reads exactly this time. */
export function wallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  tz: string = APP_TIME_ZONE
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let utc = guess - zoneOffsetMinutes(new Date(guess), tz) * 60000;
  // The offset can differ at the corrected instant around a DST change; one more pass settles it.
  utc = guess - zoneOffsetMinutes(new Date(utc), tz) * 60000;
  return new Date(utc);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD of an instant in the zone. */
export function dateKey(date: Date, tz: string = APP_TIME_ZONE): string {
  const p = zonedParts(date, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

function parseKey(key: string): { year: number; month: number; day: number } {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day };
}

/** A date key moved by whole days (calendar arithmetic, so no zone or DST involved). */
export function addDaysToKey(key: string, days: number): string {
  const { year, month, day } = parseKey(key);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Monday of the week containing the date key. */
export function mondayKey(key: string): string {
  const { year, month, day } = parseKey(key);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addDaysToKey(key, -((weekday + 6) % 7));
}

/** Whole weeks between the weeks (Monday start) containing `target` and `now`. */
export function weekOffsetBetween(target: Date, now: Date, tz: string = APP_TIME_ZONE): number {
  const a = parseKey(mondayKey(dateKey(target, tz)));
  const b = parseKey(mondayKey(dateKey(now, tz)));
  const days = (Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / 86400000;
  return Math.round(days / 7);
}

/** The Monday 00:00 (zone time) that starts the week `offset` weeks from now's week. */
export function weekStartUtc(offset: number, now: Date, tz: string = APP_TIME_ZONE): Date {
  const key = addDaysToKey(mondayKey(dateKey(now, tz)), offset * 7);
  const { year, month, day } = parseKey(key);
  return wallTimeToUtc(year, month, day, 0, 0, tz);
}

/** Start (inclusive) and end (inclusive, last millisecond) of the zone's calendar month. */
export function monthBoundsIn(now: Date, tz: string = APP_TIME_ZONE) {
  const p = zonedParts(now, tz);
  const start = wallTimeToUtc(p.year, p.month, 1, 0, 0, tz);
  const nextStart = wallTimeToUtc(p.year, p.month + 1, 1, 0, 0, tz);
  return { start, end: new Date(nextStart.getTime() - 1) };
}

/** Last millisecond of the zone's current day. */
export function endOfDayIn(now: Date, tz: string = APP_TIME_ZONE): Date {
  const p = zonedParts(now, tz);
  return new Date(wallTimeToUtc(p.year, p.month, p.day + 1, 0, 0, tz).getTime() - 1);
}

/** Value for a <input type="datetime-local">: the instant's wall clock in the zone. */
export function toDateTimeLocal(date: Date, tz: string = APP_TIME_ZONE): string {
  const p = zonedParts(date, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** The instant a <input type="datetime-local"> value means, read as zone time. */
export function fromDateTimeLocal(value: string, tz: string = APP_TIME_ZONE): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return new Date(NaN);
  return wallTimeToUtc(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]), tz);
}

/** Intl formatting pinned to the app zone, so server and browser print the same text. */
export function formatInZone(
  date: Date | string,
  options: Intl.DateTimeFormatOptions,
  locale = 'en-US',
  tz: string = APP_TIME_ZONE
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: tz }).format(new Date(date));
}

/** Formats a date-only column (stored as UTC midnight) without any zone shifting it a day. */
export function formatDateOnly(
  date: Date | string,
  options: Intl.DateTimeFormatOptions,
  locale = 'en-US'
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(new Date(date));
}
