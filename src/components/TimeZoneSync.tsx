'use client';

import { useEffect, useRef } from 'react';
import { setTimeZoneAction } from '@/app/actions/profile';

/** On a tutor's first visit, saves the time zone their browser reports so nothing needs setting up. */
export default function TimeZoneSync({ savedTimeZone, signedIn }: { savedTimeZone: string | null; signedIn: boolean }) {
  const sent = useRef(false);

  useEffect(() => {
    if (!signedIn || savedTimeZone || sent.current) return;
    sent.current = true;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected) setTimeZoneAction(detected).catch((err) => console.error('Could not save the time zone.', err));
  }, [signedIn, savedTimeZone]);

  return null;
}
