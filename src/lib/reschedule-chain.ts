import { weekOffsetBetween } from './time';

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

/** How many weeks the week containing `target` is from the week containing `now` (Monday start, app zone). */
export function weekOffsetFor(target: Date, now: Date, tz?: string): number {
  return weekOffsetBetween(target, now, tz);
}

/** Confirmation text for reopening a cancelled, absent or rescheduled lesson. */
export function reopenMessage(opts: { fineAmount: number; movedToLabel?: string | null }): string {
  const parts = ['Put this lesson back on the schedule?'];
  if (opts.movedToLabel) {
    parts.push(`The new lesson on ${opts.movedToLabel} will be removed.`);
  }
  if (opts.fineAmount > 0) {
    parts.push(`The Rp ${opts.fineAmount.toLocaleString('id-ID')} fine is removed from payroll.`);
  }
  return parts.join(' ');
}
