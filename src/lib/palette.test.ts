import { describe, expect, test } from 'bun:test';
import { filterItems, matchScore, type PaletteItem } from './palette';

const items: PaletteItem[] = [
  { id: 'dash', label: 'Dashboard', group: 'Go to', keywords: 'home overview' },
  { id: 'sched', label: 'Schedule', group: 'Go to', keywords: 'calendar timetable week' },
  { id: 'log', label: 'Log session', group: 'Go to', keywords: 'record lesson' },
  { id: 's1', label: 'Steven', hint: 'IGCSE Mathematics', group: 'Students' },
  { id: 's2', label: 'Maya', hint: 'IGCSE Physics', group: 'Students' },
];

describe('palette matching', () => {
  test('empty query keeps everything in order', () => {
    expect(filterItems(items, '').map((i) => i.id)).toEqual(['dash', 'sched', 'log', 's1', 's2']);
  });

  test('prefix matches come first', () => {
    expect(filterItems(items, 's').map((i) => i.id)[0]).toBe('sched');
  });

  test('matches the start of any word in the label', () => {
    expect(filterItems(items, 'sess').map((i) => i.id)).toEqual(['log']);
  });

  test('matches hints and keywords', () => {
    expect(filterItems(items, 'physics').map((i) => i.id)).toEqual(['s2']);
    expect(filterItems(items, 'calendar').map((i) => i.id)).toEqual(['sched']);
  });

  test('all typed words must match', () => {
    expect(filterItems(items, 'igcse math').map((i) => i.id)).toEqual(['s1']);
    expect(filterItems(items, 'igcse zzz')).toEqual([]);
  });

  test('is case-insensitive and ignores surrounding spaces', () => {
    expect(matchScore(items[0], '  DASH ')).toBe(1);
  });

  test('no match is null', () => {
    expect(matchScore(items[0], 'zebra')).toBeNull();
  });
});
