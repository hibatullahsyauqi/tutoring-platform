import { cache } from 'react';
import { redirect } from 'next/navigation';
import { prisma } from './prisma';
import { createClient } from './supabase/server';

/**
 * Resolves the logged-in Supabase user to their Tutor row, creating it on first
 * sight. Redirects to /login when there is no session. Every server action and
 * data-loading page must call this and scope queries by the returned tutor id.
 */
export const requireTutor = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) redirect('/login');

  const email = user.email;
  return prisma.tutor.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: user.user_metadata?.full_name || email.split('@')[0],
    },
  });
});

/** Throws unless the student belongs to the tutor. */
export async function assertOwnsStudent(tutorId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, tutorId },
    select: { id: true },
  });
  if (!student) throw new Error('Student not found.');
}
