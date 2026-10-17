export type ChainSession = {
  id: string;
  sessionDate: Date;
  status: string;
  rescheduledFromId: string | null;
};

/**
 * Where a rescheduled lesson ended up. If the replacement was itself rescheduled, follows the
 * chain to the latest lesson. Returns null when the lesson was never rescheduled (or its
 * replacement was deleted).
 */
export function finalRescheduleTarget(
  sessionId: string,
  sessions: ChainSession[]
): ChainSession | null {
  const byFrom = new Map<string, ChainSession>();
  for (const s of sessions) {
    if (s.rescheduledFromId) byFrom.set(s.rescheduledFromId, s);
  }

  let current = byFrom.get(sessionId) ?? null;
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    const next = byFrom.get(current.id);
    if (!next) break;
    current = next;
  }
  return current;
}

/** How many weeks the week containing `target` is from the week containing `now` (Monday start). */
export function weekOffsetFor(target: Date, now: Date): number {
  const mondayOf = (d: Date) => {
    const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
    return m;
  };
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  return Math.round((mondayOf(target).getTime() - mondayOf(now).getTime()) / weekMs);
}
