'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../../lib/prisma';
import { requireTutor } from '../../lib/auth';
import { isValidTimeZone } from '../../lib/time';

/** Saves the tutor's time zone (an IANA name, e.g. "Asia/Jakarta"). */
export async function setTimeZoneAction(timeZone: string) {
  if (!isValidTimeZone(timeZone)) throw new Error('That is not a valid time zone.');
  const tutor = await requireTutor();
  await prisma.tutor.update({ where: { id: tutor.id }, data: { timeZone } });
  // Every page reads the zone, so refresh them all.
  revalidatePath('/', 'layout');
  return { ok: true as const };
}
