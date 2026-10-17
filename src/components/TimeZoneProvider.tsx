'use client';

import { createContext, useContext, useMemo } from 'react';
import {
  addDaysToKey,
  dateKey,
  formatInZone,
  fromDateTimeLocal,
  mondayKey,
  toDateTimeLocal,
  wallTimeToUtc,
  weekOffsetBetween,
  zoneLabel,
} from '@/lib/time';

const TimeZoneContext = createContext<string | null>(null);

export function TimeZoneProvider({ timeZone, children }: { timeZone: string; children: React.ReactNode }) {
  return <TimeZoneContext.Provider value={timeZone}>{children}</TimeZoneContext.Provider>;
}

/** The signed-in tutor's time zone, with the time helpers already bound to it. */
export function useTimeZone() {
  const tz = useContext(TimeZoneContext);
  if (!tz) throw new Error('useTimeZone must be used inside <TimeZoneProvider>.');
  return useMemo(
    () => ({
      tz,
      label: zoneLabel(tz),
      format: (date: Date | string, options: Intl.DateTimeFormatOptions, locale?: string) =>
        formatInZone(date, options, locale, tz),
      dateKey: (date: Date) => dateKey(date, tz),
      toDateTimeLocal: (date: Date) => toDateTimeLocal(date, tz),
      fromDateTimeLocal: (value: string) => fromDateTimeLocal(value, tz),
      wallTimeToUtc: (y: number, m: number, d: number, h = 0, min = 0) => wallTimeToUtc(y, m, d, h, min, tz),
      weekOffsetFor: (target: Date, now: Date) => weekOffsetBetween(target, now, tz),
      addDaysToKey,
      mondayKey,
    }),
    [tz]
  );
}
