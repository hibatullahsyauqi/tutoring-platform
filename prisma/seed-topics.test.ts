import { describe, expect, test } from 'bun:test';
import { TOPIC_SETS } from './seed-topics';

describe('TOPIC_SETS', () => {
  test.each(TOPIC_SETS.map((s) => [`${s.boardCode} ${s.subjectCode}`, s] as const))(
    '%s has unique codes and non-empty titles',
    (_name, set) => {
      const codes = set.topics.map(([code]) => code);
      expect(new Set(codes).size).toBe(codes.length);
      for (const [code, title] of set.topics) {
        expect(code.trim()).not.toBe('');
        expect(title.trim()).not.toBe('');
      }
      expect(set.topics.length).toBeGreaterThan(0);
    }
  );

  test('every course appears once', () => {
    const keys = TOPIC_SETS.map((s) => `${s.boardCode}:${s.subjectCode}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
