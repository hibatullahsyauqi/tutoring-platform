export type Mastery = 'STRUGGLING' | 'NEEDS_PRACTICE' | 'MASTERED';

export type TopicState =
  | 'UNTOUCHED'
  | 'PRIOR'
  | 'STRUGGLING'
  | 'DEVELOPING'
  | 'IMPROVING'
  | 'MASTERED';

export type ProgressTopic = { id: string; code: string; title: string };

export type ProgressSession = {
  sessionDate: Date;
  status: string;
  segments: { topicId: string; masteryStatus: Mastery }[];
};

export type TopicProgress = ProgressTopic & {
  state: TopicState;
  lessons: number;
  lastTaught: Date | null;
  daysSince: number | null;
};

export type TopicGroup = { label: string; topics: TopicProgress[] };

export type Suggestion = {
  topic: TopicProgress;
  kind: 'struggling' | 'practice' | 'new' | 'recall';
  reason: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Practice topics untouched this long are worth a revisit. */
export const PRACTICE_STALE_DAYS = 7;
/** Mastered topics untouched this long get a quick recall check. */
export const RECALL_STALE_DAYS = 30;

/**
 * Derives each topic's state from completed lessons only. The latest rating wins, except that a
 * "developing" rating after an earlier struggle reads as improving. A topic with no lessons but
 * marked as known when the student joined is PRIOR; any lesson taught since overrides that.
 */
export function computeTopicProgress(
  topics: ProgressTopic[],
  sessions: ProgressSession[],
  now: Date,
  priorTopicIds: ReadonlySet<string> = new Set()
): TopicProgress[] {
  const history = new Map<string, { date: Date; mastery: Mastery }[]>();
  for (const s of sessions) {
    if (s.status !== 'COMPLETED') continue;
    for (const seg of s.segments) {
      const list = history.get(seg.topicId) ?? [];
      list.push({ date: s.sessionDate, mastery: seg.masteryStatus });
      history.set(seg.topicId, list);
    }
  }

  return topics.map((t) => {
    const entries = (history.get(t.id) ?? []).sort((a, b) => a.date.getTime() - b.date.getTime());
    if (entries.length === 0) {
      const state = priorTopicIds.has(t.id) ? 'PRIOR' : 'UNTOUCHED';
      return { ...t, state, lessons: 0, lastTaught: null, daysSince: null };
    }
    const latest = entries[entries.length - 1];
    let state: TopicState;
    if (latest.mastery === 'MASTERED') state = 'MASTERED';
    else if (latest.mastery === 'STRUGGLING') state = 'STRUGGLING';
    else if (entries.some((e) => e.mastery === 'STRUGGLING')) state = 'IMPROVING';
    else state = 'DEVELOPING';

    return {
      ...t,
      state,
      lessons: entries.length,
      lastTaught: latest.date,
      daysSince: Math.max(0, Math.floor((now.getTime() - latest.date.getTime()) / DAY_MS)),
    };
  });
}

const compareCodes = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

/** Groups by the "Area:" title prefix when present, otherwise by the code's leading part. */
export function groupTopics(topics: TopicProgress[]): TopicGroup[] {
  const groups = new Map<string, TopicProgress[]>();
  for (const t of [...topics].sort((a, b) => compareCodes(a.code, b.code))) {
    const colon = t.title.indexOf(': ');
    let label: string;
    if (colon > 0) label = t.title.slice(0, colon);
    else if (t.code.includes('.')) label = `Section ${t.code.slice(0, t.code.lastIndexOf('.'))}`;
    else label = 'Syllabus topics';
    const list = groups.get(label) ?? [];
    list.push(t);
    groups.set(label, list);
  }
  return [...groups].map(([label, list]) => ({ label, topics: list }));
}

/** Title shown inside a group, without the repeated "Area: " prefix. */
export function shortTitle(title: string): string {
  const colon = title.indexOf(': ');
  return colon > 0 ? title.slice(colon + 2) : title;
}

const ago = (days: number | null) =>
  days === null ? '' : days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;

/** What to teach next: struggles first, then topics to firm up, then new ground, then recall checks. */
export function suggestNext(progress: TopicProgress[]): Suggestion[] {
  const ordered = [...progress].sort((a, b) => compareCodes(a.code, b.code));
  const byStale = (a: TopicProgress, b: TopicProgress) => (b.daysSince ?? 0) - (a.daysSince ?? 0);

  const struggling = ordered
    .filter((t) => t.state === 'STRUGGLING')
    .sort(byStale)
    .slice(0, 3)
    .map<Suggestion>((topic) => ({
      topic,
      kind: 'struggling',
      reason: `Still struggling, last taught ${ago(topic.daysSince)}`,
    }));

  const practice = ordered
    .filter(
      (t) =>
        (t.state === 'DEVELOPING' || t.state === 'IMPROVING') &&
        (t.daysSince ?? 0) >= PRACTICE_STALE_DAYS
    )
    .sort(byStale)
    .slice(0, 2)
    .map<Suggestion>((topic) => ({
      topic,
      kind: 'practice',
      reason: `${topic.state === 'IMPROVING' ? 'Improving' : 'Developing'}, not revisited since ${ago(topic.daysSince)}`,
    }));

  const fresh = ordered
    .filter((t) => t.state === 'UNTOUCHED')
    .slice(0, 2)
    .map<Suggestion>((topic) => ({ topic, kind: 'new', reason: 'Not yet covered' }));

  const recall = ordered
    .filter((t) => t.state === 'MASTERED' && (t.daysSince ?? 0) >= RECALL_STALE_DAYS)
    .sort(byStale)
    .slice(0, 1)
    .map<Suggestion>((topic) => ({
      topic,
      kind: 'recall',
      reason: `Mastered ${ago(topic.daysSince)}. A quick recall check keeps it fresh`,
    }));

  return [...struggling, ...practice, ...fresh, ...recall];
}
