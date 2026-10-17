import type { ProgressSession, TopicProgress } from './syllabus-progress';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Pace is measured over the last four weeks of teaching. */
const PACE_WINDOW_DAYS = 28;
/** Within 10% of the required pace still counts as on track. */
const ON_TRACK_TOLERANCE = 0.9;

export type PaceStatus = 'ON_TRACK' | 'BEHIND' | 'ALL_COVERED' | 'NO_DATA';

export type ExamPace =
  | { kind: 'none' }
  | { kind: 'passed'; daysAgo: number }
  | {
      kind: 'active';
      daysLeft: number;
      weeksLeft: number;
      toCover: number;
      toFirmUp: number;
      requiredPerWeek: number;
      actualPerWeek: number | null;
      /** Weeks needed to cover the rest at the current pace, or null when there is no pace yet. */
      weeksNeeded: number | null;
      status: PaceStatus;
    };

/** Earliest completed lesson in which each topic was taught. */
export function firstTaughtDates(sessions: ProgressSession[]): Map<string, Date> {
  const first = new Map<string, Date>();
  for (const s of sessions) {
    if (s.status !== 'COMPLETED') continue;
    for (const seg of s.segments) {
      const seen = first.get(seg.topicId);
      if (!seen || s.sessionDate < seen) first.set(seg.topicId, s.sessionDate);
    }
  }
  return first;
}

export function computeExamPace(
  targetExamDate: Date | null,
  now: Date,
  progress: TopicProgress[],
  sessions: ProgressSession[]
): ExamPace {
  if (!targetExamDate) return { kind: 'none' };

  const daysLeft = Math.ceil((targetExamDate.getTime() - now.getTime()) / DAY_MS);
  if (daysLeft < 0) return { kind: 'passed', daysAgo: -daysLeft };

  const toCover = progress.filter((t) => t.state === 'UNTOUCHED').length;
  const toFirmUp = progress.filter(
    (t) => t.state === 'STRUGGLING' || t.state === 'DEVELOPING' || t.state === 'IMPROVING'
  ).length;

  // Never divide by less than a day, so an exam today still gives a finite requirement.
  const weeksLeft = Math.max(daysLeft, 1) / 7;
  const requiredPerWeek = toCover / weeksLeft;

  const completed = sessions.filter((s) => s.status === 'COMPLETED');
  let actualPerWeek: number | null = null;
  if (completed.length > 0) {
    const firstLesson = Math.min(...completed.map((s) => s.sessionDate.getTime()));
    const spanDays = Math.min(
      PACE_WINDOW_DAYS,
      Math.max(7, Math.ceil((now.getTime() - firstLesson) / DAY_MS))
    );
    const since = now.getTime() - spanDays * DAY_MS;
    let taught = 0;
    for (const date of firstTaughtDates(sessions).values()) {
      if (date.getTime() >= since) taught += 1;
    }
    actualPerWeek = taught / (spanDays / 7);
  }

  const weeksNeeded = actualPerWeek && actualPerWeek > 0 ? toCover / actualPerWeek : null;

  let status: PaceStatus;
  if (toCover === 0) status = 'ALL_COVERED';
  else if (actualPerWeek === null) status = 'NO_DATA';
  else if (actualPerWeek >= requiredPerWeek * ON_TRACK_TOLERANCE) status = 'ON_TRACK';
  else status = 'BEHIND';

  return {
    kind: 'active',
    daysLeft,
    weeksLeft,
    toCover,
    toFirmUp,
    requiredPerWeek,
    actualPerWeek,
    weeksNeeded,
    status,
  };
}
