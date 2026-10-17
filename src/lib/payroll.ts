import type { EducationLevel, SessionStatus, SessionType } from '@prisma/client';
import { APP_TIME_ZONE, monthBoundsIn, wallTimeToUtc, zonedParts } from './time';

/** All amounts are whole IDR. */
export const PPH_RATE = 0.025;
export const LATENESS_GRACE_MINUTES = 15;
export const LATENESS_FINE_PER_INTERVAL = 10_000;
export const PAYROLL_DAY_OF_MONTH = 20;

const TRIAL_RATE = 60_000;

const SESSION_RATE_BY_LEVEL: Record<EducationLevel, number> = {
  PRIMARY: 60_000,
  LOWER_SECONDARY: 75_000,
  MYP: 75_000,
  IGCSE: 100_000,
  A_LEVEL: 150_000,
  DP: 150_000,
  OTHER: 75_000,
};

const ABSENCE_FINE_BY_LEVEL: Partial<Record<EducationLevel, number>> = {
  IGCSE: 100_000,
  A_LEVEL: 150_000,
  DP: 150_000,
};
const DEFAULT_ABSENCE_FINE = 75_000;

export function sessionRate(level: EducationLevel, sessionType: SessionType): number {
  if (sessionType === 'TRIAL_CLASS') return TRIAL_RATE;
  return SESSION_RATE_BY_LEVEL[level] ?? SESSION_RATE_BY_LEVEL.OTHER;
}

/** 10k IDR per full 15-minute block of lateness; nothing under 15 minutes. */
export function latenessFine(latenessMinutes: number): number {
  if (!Number.isFinite(latenessMinutes) || latenessMinutes < LATENESS_GRACE_MINUTES) return 0;
  return Math.floor(latenessMinutes / LATENESS_GRACE_MINUTES) * LATENESS_FINE_PER_INTERVAL;
}

/** Fine for an unexcused absence, by course level. */
export function absenceFine(level: EducationLevel): number {
  return ABSENCE_FINE_BY_LEVEL[level] ?? DEFAULT_ABSENCE_FINE;
}

export type PayrollSession = {
  status: SessionStatus;
  sessionType: SessionType;
  fineAmount: number;
  course: { level: EducationLevel };
};

export type PayrollSummary = {
  grossSalary: number;
  pphTax: number;
  totalFines: number;
  totalDeductions: number;
  netSalary: number;
};

/**
 * Only taught lessons earn the session rate. Fines come from lessons taught late and from
 * unexcused absences, which earn nothing but still cost the tutor. Cancellations with notice
 * carry no fine, and anything else (scheduled, rescheduled) never reaches payroll.
 */
export function computePayroll(sessions: PayrollSession[]): PayrollSummary {
  let grossSalary = 0;
  let totalFines = 0;
  for (const s of sessions) {
    if (s.status === 'COMPLETED') {
      grossSalary += sessionRate(s.course.level, s.sessionType);
      totalFines += s.fineAmount;
    } else if (s.status === 'ABSENT_UNNOTIFIED') {
      totalFines += s.fineAmount;
    }
  }
  const pphTax = Math.round(grossSalary * PPH_RATE);
  const totalDeductions = pphTax + totalFines;
  return {
    grossSalary,
    pphTax,
    totalFines,
    totalDeductions,
    netSalary: Math.max(0, grossSalary - totalDeductions),
  };
}

/** Calendar-month bounds in the app's time zone (see lib/time.ts), matching the dashboard. */
export function monthBounds(now: Date, tz: string = APP_TIME_ZONE) {
  return monthBoundsIn(now, tz);
}

/** Disbursement is the 20th of the month after `now`'s month (midnight, app zone). */
export function nextDisbursementDate(now: Date, tz: string = APP_TIME_ZONE): Date {
  const p = zonedParts(now, tz);
  return wallTimeToUtc(p.year, p.month + 1, PAYROLL_DAY_OF_MONTH, 0, 0, tz);
}
