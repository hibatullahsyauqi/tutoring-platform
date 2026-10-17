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
      { sessionType: 'REGULAR_LESSON', fineAmount: 0, course: { level: 'IGCSE' } },
      { sessionType: 'REGULAR_LESSON', fineAmount: 10_000, course: { level: 'A_LEVEL' } },
      { sessionType: 'TRIAL_CLASS', fineAmount: 0, course: { level: 'A_LEVEL' } },
    ]);
    expect(r.grossSalary).toBe(310_000);
    expect(r.pphTax).toBe(7_750);
    expect(r.totalFines).toBe(10_000);
    expect(r.netSalary).toBe(292_250);
  });

  test('PPh is rounded to whole IDR', () => {
    const r = computePayroll([
      { sessionType: 'REGULAR_LESSON', fineAmount: 0, course: { level: 'PRIMARY' } },
    ]);
    expect(r.pphTax).toBe(1_500);
    expect(Number.isInteger(r.pphTax)).toBe(true);
  });

  test('net never goes negative', () => {
    const r = computePayroll([
      { sessionType: 'REGULAR_LESSON', fineAmount: 500_000, course: { level: 'PRIMARY' } },
    ]);
    expect(r.netSalary).toBe(0);
  });
});

describe('dates', () => {
  test('monthBounds covers the full month incl. leap February', () => {
    const { start, end } = monthBounds(new Date(2028, 1, 10));
    expect(start).toEqual(new Date(2028, 1, 1, 0, 0, 0, 0));
    expect(end).toEqual(new Date(2028, 1, 29, 23, 59, 59, 999));
  });

  test('disbursement is the 20th of next month, across year end', () => {
    expect(nextDisbursementDate(new Date(2026, 11, 31))).toEqual(new Date(2027, 0, 20));
    expect(nextDisbursementDate(new Date(2026, 9, 17))).toEqual(new Date(2026, 10, 20));
  });
});
