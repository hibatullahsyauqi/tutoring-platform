import { describe, expect, test } from 'bun:test';
import {
  cancelSessionSchema,
  createSessionSchema,
  createStudentSchema,
  parseInput,
  scheduleSessionSchema,
} from './validation';

const id = '3f2b8c1e-5d4a-4e6b-9a7c-1b2d3e4f5a6b';
const id2 = '7a9c0d2e-1f3b-4c5d-8e6f-0a1b2c3d4e5f';

const validSession = {
  studentId: id,
  courseId: id2,
  sessionDate: '2026-10-01T10:00:00.000Z',
  durationMinutes: 90,
  sessionType: 'REGULAR_LESSON',
  latenessMinutes: 0,
  segments: [
    {
      topicId: id,
      durationMinutes: 30,
      activityType: 'GUIDED_PRACTICE',
      masteryStatus: 'MASTERED',
    },
  ],
  reflection: {},
};

describe('createSessionSchema', () => {
  test('accepts a valid session', () => {
    expect(createSessionSchema.safeParse(validSession).success).toBe(true);
  });

  test.each([
    ['negative duration', { durationMinutes: -5 }],
    ['fractional duration', { durationMinutes: 90.5 }],
    ['negative lateness', { latenessMinutes: -15 }],
    ['absurd lateness', { latenessMinutes: 100000 }],
    ['unknown session type', { sessionType: 'PARTY' }],
    ['bad student id', { studentId: 'nope' }],
    ['unparseable date', { sessionDate: 'tomorrow-ish' }],
    ['javascript: meeting link', { meetingUrl: 'javascript:alert(1)' }],
    ['non-http recording link', { recordingUrl: 'ftp://x.test/a' }],
  ])('rejects %s', (_label, patch) => {
    expect(createSessionSchema.safeParse({ ...validSession, ...patch }).success).toBe(false);
  });

  test('rejects an invalid mastery status in a segment', () => {
    const bad = {
      ...validSession,
      segments: [{ ...validSession.segments[0], masteryStatus: 'GENIUS' }],
    };
    expect(createSessionSchema.safeParse(bad).success).toBe(false);
  });

  test('empty and https links are fine', () => {
    const ok = { ...validSession, meetingUrl: '', recordingUrl: 'https://zoom.us/rec/1' };
    expect(createSessionSchema.safeParse(ok).success).toBe(true);
  });
});

describe('scheduleSessionSchema', () => {
  test('rejects a zero-minute session', () => {
    const r = scheduleSessionSchema.safeParse({
      studentId: id,
      courseId: id2,
      sessionDate: '2026-10-01T10:00:00.000Z',
      durationMinutes: 0,
      sessionType: 'REGULAR_LESSON',
    });
    expect(r.success).toBe(false);
  });
});

describe('cancelSessionSchema', () => {
  test('cannot "cancel" into COMPLETED or SCHEDULED', () => {
    expect(cancelSessionSchema.safeParse({ sessionId: id, newStatus: 'COMPLETED' }).success).toBe(false);
    expect(cancelSessionSchema.safeParse({ sessionId: id, newStatus: 'SCHEDULED' }).success).toBe(false);
  });
  test('accepts a real cancellation status', () => {
    expect(cancelSessionSchema.safeParse({ sessionId: id, newStatus: 'ABSENT_UNNOTIFIED' }).success).toBe(true);
  });
});

describe('createStudentSchema', () => {
  test('trims the name and rejects blank ones', () => {
    const ok = parseInput(createStudentSchema, { name: '  Ayu  ', courseId: id, tier: 'Core' });
    expect(ok.name).toBe('Ayu');
    expect(createStudentSchema.safeParse({ name: '   ', courseId: id, tier: 'Core' }).success).toBe(false);
  });
});

describe('parseInput', () => {
  test('throws one readable message naming the field', () => {
    expect(() => parseInput(createStudentSchema, { name: 'A', courseId: 'x', tier: 'Core' })).toThrow(
      /courseId/
    );
  });
});
