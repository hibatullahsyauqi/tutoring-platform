import { describe, expect, test } from 'bun:test';
import { computeExamPace } from './exam-pace';
import { monthlyMomentum } from './momentum';
import { matchesView, parseTimelineView } from './timeline';
import { computeTopicProgress, type ProgressSession } from './syllabus-progress';

const NOW = new Date('2026-10-17T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);
const inDays = (n: number) => new Date(NOW.getTime() + n * DAY);

const topics = Array.from({ length: 12 }, (_, i) => ({ id: `t${i}`, code: `${i + 1}`, title: `T${i}` }));
const lesson = (
  d: number,
  ids: string[],
  m: 'STRUGGLING' | 'NEEDS_PRACTICE' | 'MASTERED' = 'NEEDS_PRACTICE',
  status = 'COMPLETED'
): ProgressSession => ({
  sessionDate: daysAgo(d),
  status,
  segments: ids.map((topicId) => ({ topicId, masteryStatus: m })),
});

const pace = (exam: Date | null, sessions: ProgressSession[]) =>
  computeExamPace(exam, NOW, computeTopicProgress(topics, sessions, NOW), sessions);

describe('computeExamPace', () => {
  test('no exam date', () => {
    expect(pace(null, []).kind).toBe('none');
  });

  test('exam in the past', () => {
    expect(pace(daysAgo(3), [])).toEqual({ kind: 'passed', daysAgo: 3 });
  });

  test('no lessons yet gives no pace data', () => {
    const p = pace(inDays(70), []);
    expect(p.kind === 'active' && p.status).toBe('NO_DATA');
    expect(p.kind === 'active' && p.toCover).toBe(12);
    expect(p.kind === 'active' && p.requiredPerWeek).toBeCloseTo(1.2, 5);
  });

  test('on track when pace meets the requirement', () => {
    // 4 topics over the 3 weeks since the first lesson, 8 left in 8 weeks = 1/week required
    const p = pace(inDays(56), [lesson(21, ['t0', 't1']), lesson(7, ['t2', 't3'])]);
    expect(p.kind === 'active' && p.status).toBe('ON_TRACK');
    expect(p.kind === 'active' && p.actualPerWeek).toBeCloseTo(4 / 3, 5);
  });

  test('behind when the pace is too slow', () => {
    const p = pace(inDays(28), [lesson(14, ['t0'])]);
    expect(p.kind === 'active' && p.status).toBe('BEHIND');
  });

  test('re-teaching a topic does not count as new ground', () => {
    const p = pace(inDays(56), [lesson(21, ['t0']), lesson(14, ['t0']), lesson(7, ['t0'])]);
    expect(p.kind === 'active' && p.actualPerWeek).toBeCloseTo(1 / 3, 5);
  });

  test('all covered', () => {
    const p = pace(inDays(10), [lesson(5, topics.map((t) => t.id))]);
    expect(p.kind === 'active' && p.status).toBe('ALL_COVERED');
  });

  test('counts weak topics still to firm up', () => {
    const p = pace(inDays(30), [lesson(5, ['t0', 't1'], 'STRUGGLING')]);
    expect(p.kind === 'active' && p.toFirmUp).toBe(2);
  });

  test('exam today still yields finite numbers', () => {
    const p = pace(NOW, [lesson(3, ['t0'])]);
    expect(p.kind === 'active' && Number.isFinite(p.requiredPerWeek)).toBe(true);
  });
});

describe('monthlyMomentum', () => {
  test('buckets first-taught and first-mastered by month, oldest first', () => {
    const sessions = [
      lesson(60, ['t0', 't1']), // Aug
      lesson(20, ['t0'], 'MASTERED'), // Sep 27: t0 re-taught, not new; first mastered
      lesson(2, ['t2'], 'MASTERED'), // Oct
    ];
    const m = monthlyMomentum(sessions, NOW, 3);
    expect(m.map((x) => x.covered)).toEqual([2, 0, 1]);
    expect(m.map((x) => x.mastered)).toEqual([0, 1, 1]);
    expect(m).toHaveLength(3);
  });

  test('ignores non-completed lessons', () => {
    const m = monthlyMomentum([lesson(2, ['t0'], 'MASTERED', 'SCHEDULED')], NOW, 2);
    expect(m.every((x) => x.covered === 0 && x.mastered === 0)).toBe(true);
  });
});

describe('timeline view', () => {
  test('parses unknown values as all', () => {
    expect(parseTimelineView('nonsense')).toBe('all');
    expect(parseTimelineView(undefined)).toBe('all');
    expect(parseTimelineView('logged')).toBe('logged');
  });

  test('filters by status', () => {
    expect(matchesView('COMPLETED', 'logged')).toBe(true);
    expect(matchesView('SCHEDULED', 'logged')).toBe(false);
    expect(matchesView('SCHEDULED', 'pending')).toBe(true);
    expect(matchesView('ABSENT_UNNOTIFIED', 'cancelled')).toBe(true);
    expect(matchesView('CANCELLED_WITH_NOTICE', 'cancelled')).toBe(true);
    expect(matchesView('COMPLETED', 'cancelled')).toBe(false);
    expect(matchesView('COMPLETED', 'all')).toBe(true);
  });
});
