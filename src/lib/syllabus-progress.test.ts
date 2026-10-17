import { describe, expect, test } from 'bun:test';
import { computeTopicProgress, groupTopics, shortTitle, suggestNext } from './syllabus-progress';

const NOW = new Date('2026-10-17T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

const topics = [
  { id: 'a', code: '1.1', title: 'Number: Types' },
  { id: 'b', code: '1.2', title: 'Number: Sets' },
  { id: 'c', code: '2.1', title: 'Algebra: Basics' },
  { id: 'd', code: '2.10', title: 'Algebra: Later' },
];

const session = (daysBack: number, segments: [string, 'STRUGGLING' | 'NEEDS_PRACTICE' | 'MASTERED'][], status = 'COMPLETED') => ({
  sessionDate: daysAgo(daysBack),
  status,
  segments: segments.map(([topicId, masteryStatus]) => ({ topicId, masteryStatus })),
});

const stateOf = (progress: ReturnType<typeof computeTopicProgress>, id: string) =>
  progress.find((p) => p.id === id)!.state;

describe('computeTopicProgress', () => {
  test('untouched when never taught', () => {
    expect(stateOf(computeTopicProgress(topics, [], NOW), 'a')).toBe('UNTOUCHED');
  });

  test('latest rating wins regardless of session order in the input', () => {
    const p = computeTopicProgress(
      topics,
      [session(2, [['a', 'MASTERED']]), session(20, [['a', 'STRUGGLING']])],
      NOW
    );
    expect(stateOf(p, 'a')).toBe('MASTERED');
  });

  test('developing after an earlier struggle is improving', () => {
    const p = computeTopicProgress(
      topics,
      [session(20, [['a', 'STRUGGLING']]), session(3, [['a', 'NEEDS_PRACTICE']])],
      NOW
    );
    expect(stateOf(p, 'a')).toBe('IMPROVING');
  });

  test('regressing from mastered to struggling shows struggling', () => {
    const p = computeTopicProgress(
      topics,
      [session(20, [['a', 'MASTERED']]), session(3, [['a', 'STRUGGLING']])],
      NOW
    );
    expect(stateOf(p, 'a')).toBe('STRUGGLING');
  });

  test('ignores sessions that are not completed', () => {
    const p = computeTopicProgress(topics, [session(1, [['a', 'MASTERED']], 'SCHEDULED')], NOW);
    expect(stateOf(p, 'a')).toBe('UNTOUCHED');
  });

  test('prior knowledge applies only until a lesson is taught', () => {
    const prior = new Set(['a', 'b']);
    const p = computeTopicProgress(topics, [session(3, [['a', 'STRUGGLING']])], NOW, prior);
    expect(stateOf(p, 'a')).toBe('STRUGGLING');
    expect(stateOf(p, 'b')).toBe('PRIOR');
    expect(stateOf(p, 'c')).toBe('UNTOUCHED');
  });

  test('reports lesson count and days since last taught', () => {
    const p = computeTopicProgress(
      topics,
      [session(10, [['a', 'NEEDS_PRACTICE']]), session(4, [['a', 'NEEDS_PRACTICE']])],
      NOW
    );
    const a = p.find((x) => x.id === 'a')!;
    expect(a.lessons).toBe(2);
    expect(a.daysSince).toBe(4);
  });
});

describe('groupTopics', () => {
  test('groups by title prefix and sorts codes numerically', () => {
    const groups = groupTopics(computeTopicProgress(topics, [], NOW));
    expect(groups.map((g) => g.label)).toEqual(['Number', 'Algebra']);
    expect(groups[1].topics.map((t) => t.code)).toEqual(['2.1', '2.10']);
  });

  test('falls back to the code prefix, then a single group', () => {
    const plain = [
      { id: 'x', code: 'U1.3', title: 'Unit 1 Mechanics' },
      { id: 'y', code: '4', title: 'Waves' },
    ];
    const groups = groupTopics(computeTopicProgress(plain, [], NOW));
    expect(groups.map((g) => g.label)).toEqual(['Syllabus topics', 'Section U1']);
  });

  test('shortTitle strips the area prefix', () => {
    expect(shortTitle('Number: Types of number')).toBe('Types of number');
    expect(shortTitle('Waves')).toBe('Waves');
  });
});

describe('suggestNext', () => {
  const many = [
    { id: 's1', code: '1', title: 'S1' },
    { id: 'p1', code: '2', title: 'P1' },
    { id: 'p2', code: '3', title: 'P2' },
    { id: 'n1', code: '4', title: 'N1' },
    { id: 'n2', code: '5', title: 'N2' },
    { id: 'n3', code: '6', title: 'N3' },
    { id: 'm1', code: '7', title: 'M1' },
    { id: 'm2', code: '8', title: 'M2' },
  ];

  const progress = computeTopicProgress(
    many,
    [
      session(5, [['s1', 'STRUGGLING']]),
      session(10, [['p1', 'NEEDS_PRACTICE']]),
      session(2, [['p2', 'NEEDS_PRACTICE']]),
      session(45, [['m1', 'MASTERED']]),
      session(3, [['m2', 'MASTERED']]),
    ],
    NOW
  );
  const out = suggestNext(progress);

  test('orders struggling, practice, new, then recall', () => {
    expect(out.map((s) => s.kind)).toEqual(['struggling', 'practice', 'new', 'new', 'recall']);
  });

  test('skips recently taught practice topics and recent mastered ones', () => {
    const ids = out.map((s) => s.topic.id);
    expect(ids).not.toContain('p2');
    expect(ids).not.toContain('m2');
  });

  test('suggests untouched topics in syllabus order, limited to two', () => {
    expect(out.filter((s) => s.kind === 'new').map((s) => s.topic.id)).toEqual(['n1', 'n2']);
  });

  test('starts new material after prior-knowledge topics', () => {
    const p = computeTopicProgress(many, [], NOW, new Set(['s1', 'p1', 'p2']));
    const out = suggestNext(p);
    expect(out.map((s) => s.kind)).toEqual(['new', 'new']);
    expect(out.map((s) => s.topic.id)).toEqual(['n1', 'n2']);
  });

  test('is empty when everything is fresh and mastered', () => {
    const done = computeTopicProgress(topics, [session(1, topics.map((t) => [t.id, 'MASTERED'] as ['a', 'MASTERED']))], NOW);
    expect(suggestNext(done)).toEqual([]);
  });
});
