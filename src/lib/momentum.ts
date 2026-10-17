import { firstTaughtDates } from './exam-pace';
import { DEFAULT_TIME_ZONE, formatInZone, wallTimeToUtc, zonedParts } from './time';
import type { ProgressSession } from './syllabus-progress';

export type MonthMomentum = { key: string; label: string; covered: number; mastered: number };

const monthKey = (d: Date, tz: string) => {
  const p = zonedParts(d, tz);
  return `${p.year}-${String(p.month).padStart(2, '0')}`;
};

/** Per month: topics taught for the first time, and topics rated mastered for the first time. */
export function monthlyMomentum(
  sessions: ProgressSession[],
  now: Date,
  months = 6,
  tz: string = DEFAULT_TIME_ZONE
): MonthMomentum[] {
  const buckets: MonthMomentum[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    // Mid-month noon in the app zone: safely inside the month whatever the offset.
    const p = zonedParts(now, tz);
    const d = wallTimeToUtc(p.year, p.month - i, 15, 12, 0, tz);
    buckets.push({
      key: monthKey(d, tz),
      label: formatInZone(d, { month: 'short' }, 'en-US', tz),
      covered: 0,
      mastered: 0,
    });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));

  for (const date of firstTaughtDates(sessions).values()) {
    const b = byKey.get(monthKey(date, tz));
    if (b) b.covered += 1;
  }

  const firstMastered = new Map<string, Date>();
  for (const s of sessions) {
    if (s.status !== 'COMPLETED') continue;
    for (const seg of s.segments) {
      if (seg.masteryStatus !== 'MASTERED') continue;
      const seen = firstMastered.get(seg.topicId);
      if (!seen || s.sessionDate < seen) firstMastered.set(seg.topicId, s.sessionDate);
    }
  }
  for (const date of firstMastered.values()) {
    const b = byKey.get(monthKey(date, tz));
    if (b) b.mastered += 1;
  }

  return buckets;
}
