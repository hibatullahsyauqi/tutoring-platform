import { describe, expect, test } from 'bun:test';
import { finalRescheduleTarget, reopenMessage, weekOffsetFor, type ChainSession } from './reschedule-chain';

const s = (id: string, day: number, status: string, from: string | null = null): ChainSession => ({
  id,
  sessionDate: new Date(2026, 9, day, 18, 30),
  status,
  rescheduledFromId: from,
});

describe('finalRescheduleTarget', () => {
  test('null when never rescheduled', () => {
    expect(finalRescheduleTarget('a', [s('a', 10, 'SCHEDULED')])).toBeNull();
  });

  test('finds the direct replacement', () => {
    const all = [s('a', 10, 'RESCHEDULED'), s('b', 14, 'SCHEDULED', 'a')];
    expect(finalRescheduleTarget('a', all)?.id).toBe('b');
  });

  test('follows a chain of reschedules to the latest lesson', () => {
    const all = [
      s('a', 10, 'RESCHEDULED'),
      s('b', 14, 'RESCHEDULED', 'a'),
      s('c', 21, 'SCHEDULED', 'b'),
    ];
    expect(finalRescheduleTarget('a', all)?.id).toBe('c');
    expect(finalRescheduleTarget('b', all)?.id).toBe('c');
  });

  test('survives a corrupt cycle', () => {
    const all = [s('a', 10, 'RESCHEDULED', 'b'), s('b', 14, 'RESCHEDULED', 'a')];
    expect(finalRescheduleTarget('a', all)).not.toBeUndefined();
  });
});

describe('weekOffsetFor', () => {
  const now = new Date(2026, 9, 17, 12); // Sat 17 Oct 2026

  test('same week is 0, Monday and Sunday included', () => {
    expect(weekOffsetFor(new Date(2026, 9, 12), now)).toBe(0);
    expect(weekOffsetFor(new Date(2026, 9, 18, 23), now)).toBe(0);
  });

  test('next and previous weeks', () => {
    expect(weekOffsetFor(new Date(2026, 9, 19), now)).toBe(1);
    expect(weekOffsetFor(new Date(2026, 9, 11), now)).toBe(-1);
    expect(weekOffsetFor(new Date(2026, 10, 14), now)).toBe(4);
  });
});

describe('reopenMessage', () => {
  test('plain reopen', () => {
    expect(reopenMessage({ fineAmount: 0 })).toBe('Put this lesson back on the schedule?');
  });

  test('mentions the replacement and the fine', () => {
    const m = reopenMessage({ fineAmount: 100_000, movedToLabel: 'Mon, Oct 19' });
    expect(m).toContain('The new lesson on Mon, Oct 19 will be removed.');
    expect(m).toContain('Rp 100.000 fine');
  });
});
