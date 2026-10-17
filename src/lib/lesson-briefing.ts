import { APP_TIME_ZONE, zoneLabel } from './time';

const MIN = 60_000;

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;

/** "2h 15m" / "25 min" / "3d 4h": the two largest units, never zero-padded. */
function span(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / MIN));
  if (minutes < 60) return plural(minutes, 'min');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
  }
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours === 0 ? `${days}d` : `${days}d ${restHours}h`;
}

/** Where a lesson stands relative to now: counting down, running, or over. */
export function countdownLabel(startMs: number, durationMinutes: number, nowMs: number) {
  const untilStart = startMs - nowMs;
  if (untilStart > MIN) {
    return { phase: 'upcoming' as const, text: `Starts in ${span(untilStart)}` };
  }
  if (untilStart > -MIN) {
    return { phase: 'now' as const, text: 'Starting now' };
  }
  const sinceStart = nowMs - startMs;
  if (sinceStart < durationMinutes * MIN) {
    return { phase: 'running' as const, text: `In progress · started ${span(sinceStart)} ago` };
  }
  return { phase: 'over' as const, text: `Ended ${span(sinceStart - durationMinutes * MIN)} ago` };
}

/** A ready-to-paste reminder for the student or parent. Times are in the app time zone. */
export function reminderMessage(opts: {
  studentName: string;
  courseTitle: string;
  startIso: string;
  durationMinutes: number;
  meetingUrl?: string | null;
}): string {
  const start = new Date(opts.startIso);
  const day = start.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: APP_TIME_ZONE,
  });
  const time = start.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APP_TIME_ZONE,
  });
  const lines = [
    `Hi! Reminder: ${opts.studentName}'s ${opts.courseTitle} lesson is on ${day} at ${time} ${zoneLabel()} (${opts.durationMinutes} minutes).`,
  ];
  if (opts.meetingUrl) lines.push(`Meeting link: ${opts.meetingUrl}`);
  return lines.join('\n');
}
