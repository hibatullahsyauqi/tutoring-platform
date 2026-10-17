import { describe, expect, test } from 'bun:test';
import {
  addDaysToKey,
  DEFAULT_TIME_ZONE,
  dateKey,
  endOfDayIn,
  formatInZone,
  fromDateTimeLocal,
  isValidTimeZone,
  resolveTimeZone,
  monthBoundsIn,
  mondayKey,
  toDateTimeLocal,
  wallTimeToUtc,
  weekOffsetBetween,
  weekStartUtc,
  zoneOffsetMinutes,
  zonedParts,
} from './time';

const JKT = 'Asia/Jakarta';
const NY = 'America/New_York';

describe('zonedParts and offsets', () => {
  test('reads the wall clock in the zone, not the machine', () => {
    const p = zonedParts(new Date('2026-10-17T23:30:00Z'), JKT); // 06:30 next day in Jakarta
    expect([p.year, p.month, p.day, p.hour, p.minute]).toEqual([2026, 10, 18, 6, 30]);
    expect(p.weekday).toBe(0); // Sunday
  });

  test('midnight is hour 0, never 24', () => {
    expect(zonedParts(new Date('2026-10-17T17:00:00Z'), JKT).hour).toBe(0);
  });

  test('offsets, including daylight saving', () => {
    expect(zoneOffsetMinutes(new Date('2026-10-17T00:00:00Z'), JKT)).toBe(420);
    expect(zoneOffsetMinutes(new Date('2026-01-15T12:00:00Z'), NY)).toBe(-300);
    expect(zoneOffsetMinutes(new Date('2026-07-15T12:00:00Z'), NY)).toBe(-240);
  });
});

describe('wallTimeToUtc', () => {
  test('Jakarta 18:30 is 11:30 UTC', () => {
    expect(wallTimeToUtc(2026, 10, 19, 18, 30, JKT).toISOString()).toBe('2026-10-19T11:30:00.000Z');
  });

  test('handles daylight saving on both sides', () => {
    expect(wallTimeToUtc(2026, 1, 15, 9, 0, NY).toISOString()).toBe('2026-01-15T14:00:00.000Z');
    expect(wallTimeToUtc(2026, 7, 15, 9, 0, NY).toISOString()).toBe('2026-07-15T13:00:00.000Z');
  });

  test('overflowing fields roll over (month 13, day 0)', () => {
    expect(wallTimeToUtc(2026, 13, 1, 0, 0, JKT).toISOString()).toBe('2026-12-31T17:00:00.000Z');
  });
});

describe('date keys', () => {
  test('a late-evening UTC instant is already tomorrow in Jakarta', () => {
    expect(dateKey(new Date('2026-10-17T20:00:00Z'), JKT)).toBe('2026-10-18');
  });

  test('early-morning Jakarta lessons belong to their Jakarta day, not the UTC one', () => {
    // 06:00 WIB on the 19th is 23:00 UTC on the 18th
    expect(dateKey(new Date('2026-10-18T23:00:00Z'), JKT)).toBe('2026-10-19');
  });

  test('day arithmetic crosses month and year ends', () => {
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToKey('2026-03-01', -1)).toBe('2026-02-28');
  });

  test('weeks start on Monday', () => {
    expect(mondayKey('2026-10-17')).toBe('2026-10-12'); // Saturday
    expect(mondayKey('2026-10-18')).toBe('2026-10-12'); // Sunday
    expect(mondayKey('2026-10-12')).toBe('2026-10-12');
    expect(mondayKey('2026-10-19')).toBe('2026-10-19');
  });
});

describe('weeks', () => {
  const now = new Date('2026-10-17T05:00:00Z'); // Saturday afternoon, Jakarta

  test('offset between weeks', () => {
    expect(weekOffsetBetween(new Date('2026-10-12T01:00:00Z'), now, JKT)).toBe(0);
    expect(weekOffsetBetween(new Date('2026-10-19T02:00:00Z'), now, JKT)).toBe(1); // Mon 19 Oct, 09:00 WIB
    expect(weekOffsetBetween(new Date('2026-10-11T10:00:00Z'), now, JKT)).toBe(-1);
  });

  test('Sunday night UTC is already next week in Jakarta', () => {
    // 2026-10-18 17:30 UTC = Monday 19 Oct 00:30 WIB
    expect(weekOffsetBetween(new Date('2026-10-18T17:30:00Z'), now, JKT)).toBe(1);
  });

  test('week start is Monday 00:00 in the zone', () => {
    expect(weekStartUtc(0, now, JKT).toISOString()).toBe('2026-10-11T17:00:00.000Z'); // Mon 12 Oct 00:00 WIB
    expect(weekStartUtc(1, now, JKT).toISOString()).toBe('2026-10-18T17:00:00.000Z');
    expect(weekStartUtc(-1, now, JKT).toISOString()).toBe('2026-10-04T17:00:00.000Z');
  });
});

describe('month and day bounds', () => {
  test('the month follows the zone: 31 Oct 18:00 UTC is already November in Jakarta', () => {
    const { start, end } = monthBoundsIn(new Date('2026-10-31T18:00:00Z'), JKT);
    expect(start.toISOString()).toBe('2026-10-31T17:00:00.000Z'); // 1 Nov 00:00 WIB
    expect(end.toISOString()).toBe('2026-11-30T16:59:59.999Z');
  });

  test('a mid-month instant', () => {
    const { start, end } = monthBoundsIn(new Date('2026-10-17T05:00:00Z'), JKT);
    expect(start.toISOString()).toBe('2026-09-30T17:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-31T16:59:59.999Z');
  });

  test('end of day is the last millisecond before the next local midnight', () => {
    expect(endOfDayIn(new Date('2026-10-17T05:00:00Z'), JKT).toISOString()).toBe('2026-10-17T16:59:59.999Z');
  });
});

describe('datetime-local conversion', () => {
  test('round trips in the zone', () => {
    const iso = '2026-10-19T11:30:00.000Z';
    expect(toDateTimeLocal(new Date(iso), JKT)).toBe('2026-10-19T18:30');
    expect(fromDateTimeLocal('2026-10-19T18:30', JKT).toISOString()).toBe(iso);
  });

  test('rejects junk', () => {
    expect(Number.isNaN(fromDateTimeLocal('tomorrow', JKT).getTime())).toBe(true);
  });
});

describe('formatInZone', () => {
  test('prints in the zone regardless of the machine', () => {
    expect(formatInZone('2026-10-19T11:30:00Z', { hour: '2-digit', minute: '2-digit', hour12: false }, 'en-GB', JKT)).toBe('18:30');
    expect(formatInZone('2026-10-19T11:30:00Z', { weekday: 'short', day: 'numeric', month: 'short' }, 'en-US', JKT)).toBe('Mon, Oct 19');
  });
});

describe('time zone names', () => {
  test('accepts real IANA names, rejects everything else', () => {
    expect(isValidTimeZone('Asia/Jakarta')).toBe(true);
    expect(isValidTimeZone('America/New_York')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
    expect(isValidTimeZone('x'.repeat(100))).toBe(false);
  });

  test('resolve falls back to the default', () => {
    expect(resolveTimeZone('Europe/London')).toBe('Europe/London');
    expect(resolveTimeZone(null)).toBe(DEFAULT_TIME_ZONE);
    expect(resolveTimeZone('nonsense')).toBe(DEFAULT_TIME_ZONE);
  });

  test('every helper works for another tutor in another zone', () => {
    // 07:30 in Auckland (NZDT, +13) on 20 Oct is 18:30 UTC on 19 Oct.
    const instant = wallTimeToUtc(2026, 10, 20, 7, 30, 'Pacific/Auckland');
    expect(instant.toISOString()).toBe('2026-10-19T18:30:00.000Z');
    expect(dateKey(instant, 'Pacific/Auckland')).toBe('2026-10-20');
    expect(dateKey(instant, JKT)).toBe('2026-10-20'); // 01:30 WIB the next day
    expect(dateKey(instant, NY)).toBe('2026-10-19');
  });
});
