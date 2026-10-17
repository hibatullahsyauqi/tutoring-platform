import { describe, expect, test } from 'bun:test';
import {
  absenceFine,
  computePayroll,
  latenessFine,
  monthBounds,
  nextDisbursementDate,
  sessionRate,
} from './payroll';

describe('latenessFine', () => {
  test.each([
    [0, 0],
    [14, 0],
    [15, 10_000],
    [29, 10_000],
    [30, 20_000],
    [45, 30_000],
  ])('%i min -> %i IDR', (mins, fine) => {
    expect(latenessFine(mins)).toBe(fine);
  });

  test('rejects NaN and negatives', () => {
    expect(latenessFine(NaN)).toBe(0);
    expect(latenessFine(-30)).toBe(0);
  });
});

describe('sessionRate', () => {
  test('trial class overrides level', () => {
    expect(sessionRate('A_LEVEL', 'TRIAL_CLASS')).toBe(60_000);
  });
  test('level rates', () => {
    expect(sessionRate('PRIMARY', 'REGULAR_LESSON')).toBe(60_000);
    expect(sessionRate('MYP', 'REGULAR_LESSON')).toBe(75_000);
    expect(sessionRate('IGCSE', 'EXAM_SIMULATION')).toBe(100_000);
    expect(sessionRate('DP', 'REGULAR_LESSON')).toBe(150_000);
    expect(sessionRate('OTHER', 'REGULAR_LESSON')).toBe(75_000);
  });
});

describe('absenceFine', () => {
  test('by level', () => {
    expect(absenceFine('IGCSE')).toBe(100_000);
    expect(absenceFine('A_LEVEL')).toBe(150_000);
    expect(absenceFine('PRIMARY')).toBe(75_000);
  });
});

describe('computePayroll', () => {
  test('empty month', () => {
    expect(computePayroll([])).toEqual({
      grossSalary: 0,
      pphTax: 0,
      totalFines: 0,
      totalDeductions: 0,
      netSalary: 0,
    });
  });

  test('gross, 2.5% PPh and fines', () => {
    const r = computePayroll([
      { status: 'COMPLETED', sessionType: 'REGULAR_LESSON', fineAmount: 0, course: { level: 'IGCSE' } },
      { status: 'COMPLETED', sessionType: 'REGULAR_LESSON', fineAmount: 10_000, course: { level: 'A_LEVEL' } },
      { status: 'COMPLETED', sessionType: 'TRIAL_CLASS', fineAmount: 0, course: { level: 'A_LEVEL' } },
    ]);
    expect(r.grossSalary).toBe(310_000);
    expect(r.pphTax).toBe(7_750);
    expect(r.totalFines).toBe(10_000);
    expect(r.netSalary).toBe(292_250);
  });

  test('PPh is rounded to whole IDR', () => {
    const r = computePayroll([
      { status: 'COMPLETED', sessionType: 'REGULAR_LESSON', fineAmount: 0, course: { level: 'PRIMARY' } },
    ]);
    expect(r.pphTax).toBe(1_500);
    expect(Number.isInteger(r.pphTax)).toBe(true);
  });

  test('an unexcused absence adds its fine but earns nothing', () => {
    const r = computePayroll([
      { status: 'COMPLETED', sessionType: 'REGULAR_LESSON', fineAmount: 0, course: { level: 'IGCSE' } },
      { status: 'ABSENT_UNNOTIFIED', sessionType: 'REGULAR_LESSON', fineAmount: 100_000, course: { level: 'IGCSE' } },
    ]);
    expect(r.grossSalary).toBe(100_000);
    expect(r.totalFines).toBe(100_000);
    expect(r.pphTax).toBe(2_500);
  });

  test('cancellations with notice and scheduled lessons never count', () => {
    const base = { sessionType: 'REGULAR_LESSON' as const, fineAmount: 0, course: { level: 'IGCSE' as const } };
    const r = computePayroll([
      { ...base, status: 'CANCELLED_WITH_NOTICE' },
      { ...base, status: 'CANCELLED_BY_STUDENT' },
      { ...base, status: 'SCHEDULED' },
      { ...base, status: 'RESCHEDULED' },
    ]);
    expect(r).toEqual({ grossSalary: 0, pphTax: 0, totalFines: 0, totalDeductions: 0, netSalary: 0 });
  });

  test('net never goes negative', () => {
    const r = computePayroll([
      { status: 'COMPLETED', sessionType: 'REGULAR_LESSON', fineAmount: 500_000, course: { level: 'PRIMARY' } },
    ]);
    expect(r.netSalary).toBe(0);
  });
});

describe('dates', () => {
  const JKT = 'Asia/Jakarta';

  test('monthBounds covers the full month incl. leap February, in the given zone', () => {
    const { start, end } = monthBounds(new Date('2028-02-10T05:00:00Z'), JKT);
    expect(start.toISOString()).toBe('2028-01-31T17:00:00.000Z'); // 1 Feb 00:00 WIB
    expect(end.toISOString()).toBe('2028-02-29T16:59:59.999Z'); // 29 Feb 23:59:59.999 WIB
  });

  test('the month follows the zone, not UTC: a lesson at 06:00 WIB on the 1st counts in that month', () => {
    const firstLesson = new Date('2026-10-31T23:00:00Z'); // 1 Nov 06:00 WIB
    const october = monthBounds(new Date('2026-10-15T05:00:00Z'), JKT);
    const november = monthBounds(new Date('2026-11-15T05:00:00Z'), JKT);
    expect(firstLesson > october.end).toBe(true);
    expect(firstLesson >= november.start && firstLesson <= november.end).toBe(true);
  });

  test('disbursement is the 20th of next month, across year end', () => {
    expect(nextDisbursementDate(new Date('2026-12-31T05:00:00Z'), JKT).toISOString()).toBe('2027-01-19T17:00:00.000Z');
    expect(nextDisbursementDate(new Date('2026-10-17T05:00:00Z'), JKT).toISOString()).toBe('2026-11-19T17:00:00.000Z');
  });
});
