import { describe, expect, test } from 'bun:test';
import { countdownLabel, reminderMessage } from './lesson-briefing';

const MIN = 60_000;
const NOW = Date.UTC(2026, 9, 17, 10, 0, 0);

describe('countdownLabel', () => {
  test('counts down in the two largest units', () => {
    expect(countdownLabel(NOW + 135 * MIN, 90, NOW).text).toBe('Starts in 2h 15m');
    expect(countdownLabel(NOW + 25 * MIN, 90, NOW).text).toBe('Starts in 25 mins');
    expect(countdownLabel(NOW + 120 * MIN, 90, NOW).text).toBe('Starts in 2h');
    expect(countdownLabel(NOW + (27 * 60) * MIN, 90, NOW).text).toBe('Starts in 1d 3h');
  });

  test('within a minute either side of the start is "starting now"', () => {
    expect(countdownLabel(NOW + 30_000, 90, NOW).phase).toBe('now');
    expect(countdownLabel(NOW - 30_000, 90, NOW).phase).toBe('now');
  });

  test('running while inside the duration', () => {
    const r = countdownLabel(NOW - 10 * MIN, 90, NOW);
    expect(r.phase).toBe('running');
    expect(r.text).toBe('In progress · started 10 mins ago');
  });

  test('over once the duration has passed', () => {
    const r = countdownLabel(NOW - 100 * MIN, 90, NOW);
    expect(r.phase).toBe('over');
    expect(r.text).toBe('Ended 10 mins ago');
  });

  test('singular minute', () => {
    expect(countdownLabel(NOW + 90_000, 90, NOW).text).toBe('Starts in 2 mins');
    expect(countdownLabel(NOW - 61_000, 90, NOW).text).toBe('In progress · started 1 min ago');
  });
});

describe('reminderMessage', () => {
  const base = {
    studentName: 'Steven',
    courseTitle: 'IGCSE Mathematics',
    startIso: '2026-10-19T11:30:00.000Z',
    durationMinutes: 90,
  };

  test('formats the day and time in WIB', () => {
    const m = reminderMessage(base);
    expect(m).toContain('Monday 19 October');
    expect(m).toContain('18:30 WIB');
    expect(m).toContain('90 minutes');
    expect(m).not.toContain('Meeting link');
  });

  test('adds the meeting link when there is one', () => {
    expect(reminderMessage({ ...base, meetingUrl: 'https://meet.example.com/x' })).toContain(
      'Meeting link: https://meet.example.com/x'
    );
  });
});
