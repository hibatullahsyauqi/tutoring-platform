import { describe, expect, test } from 'bun:test';
import { finalRescheduleTarget, reopenMessage, weekOffsetFor, type ChainSession } from './reschedule-chain';

const s = (id: string, day: number, status: string, from: string | null = null): ChainSession => ({
  id,
  sessionDate: new Date(Date.UTC(2026, 9, day, 11, 30)),
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
  const now = new Date('2026-10-17T05:00:00Z'); // Saturday 17 Oct 2026, noon in Jakarta

  test('same week is 0, from Monday 00:00 to Sunday 23:59 Jakarta time', () => {
    expect(weekOffsetFor(new Date('2026-10-11T17:00:00Z'), now)).toBe(0);
    expect(weekOffsetFor(new Date('2026-10-18T16:59:00Z'), now)).toBe(0);
  });

  test('next and previous weeks', () => {
    expect(weekOffsetFor(new Date('2026-10-18T17:00:00Z'), now)).toBe(1);
    expect(weekOffsetFor(new Date('2026-10-11T16:59:00Z'), now)).toBe(-1);
    expect(weekOffsetFor(new Date('2026-11-14T05:00:00Z'), now)).toBe(4);
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
