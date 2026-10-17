import { describe, expect, test } from 'bun:test';
import { isSnapshot, restoreInput, snapshotOf } from './session-snapshot';

const row = {
  id: 's1',
  studentId: 'st1',
  courseId: 'c1',
  sessionDate: new Date('2026-10-19T11:30:00Z'),
  durationMinutes: 90,
  sessionType: 'REGULAR_LESSON',
  status: 'COMPLETED',
  meetingUrl: null,
  recordingUrl: 'https://x.test/r',
  latenessMinutes: 20,
  fineAmount: 10000,
  assignedHomework: 'Ex 4B',
  nextFocusTopic: 'Indices',
  rescheduledFromId: 'prev',
  segments: [{ id: 'g1', sessionId: 's1', topicId: 't1', toolId: null, durationMinutes: 45, activityType: 'GUIDED_PRACTICE', masteryStatus: 'MASTERED' }],
  rating: null,
  checklist: null,
  reflection: { id: 'r1', sessionId: 's1', struggle: 'Surds', workedWell: null, adjustNext: null },
  resources: [],
  rescheduledTo: { id: 'next' },
} as never;

describe('session snapshot', () => {
  const snap = snapshotOf(row);

  test('survives a JSON round trip, which is how it is stored', () => {
    const revived = JSON.parse(JSON.stringify(snap));
    expect(isSnapshot(revived)).toBe(true);
    const input = restoreInput(revived, true);
    expect(input.id).toBe('s1');
    expect(input.sessionDate).toEqual(new Date('2026-10-19T11:30:00Z'));
    expect(input.fineAmount).toBe(10000);
  });

  test('keeps the notes and topic blocks', () => {
    const input = restoreInput(snap, true);
    expect((input.segments as { create: unknown[] }).create).toHaveLength(1);
    expect((input.reflection as { create: { struggle: string } }).create.struggle).toBe('Surds');
    expect(input.rating).toBeUndefined();
  });

  test('remembers the replacement so the reschedule link can be re-made', () => {
    expect(snap.replacementId).toBe('next');
  });

  test('can drop the rescheduled-from link when it is no longer valid', () => {
    expect(restoreInput(snap, true).rescheduledFromId).toBe('prev');
    expect(restoreInput(snap, false).rescheduledFromId).toBeNull();
  });

  test('rejects payloads it does not understand', () => {
    expect(isSnapshot(null)).toBe(false);
    expect(isSnapshot({ v: 2 })).toBe(false);
    expect(isSnapshot({ v: 1, session: { id: 'x' } })).toBe(false);
  });
});
