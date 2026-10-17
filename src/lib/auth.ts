import { cache } from 'react';
import { redirect } from 'next/navigation';
import { prisma } from './prisma';
import { createClient } from './supabase/server';

/**
 * The signed-in tutor, or null when nobody is signed in. Creates the tutor row on first sight.
 * Shared per request (react cache), so the layout and the page together cost one lookup.
 */
export const getTutorOrNull = cache(async () => {
  const supabase = await createClient();

  // The proxy already validated this session with Supabase on the same request, so verify the
  // token locally (no network call). Fall back to a full lookup if that yields no identity.
  const { data: claimsData } = await supabase.auth.getClaims();
  let email = typeof claimsData?.claims?.email === 'string' ? claimsData.claims.email : null;
  let fullName: string | null =
    (claimsData?.claims?.user_metadata as { full_name?: string } | undefined)?.full_name ?? null;

  if (!email) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return null;
    email = user.email;
    fullName = user.user_metadata?.full_name ?? null;
  }

  // Read first: the tutor row almost always exists, and a read is cheaper than an upsert.
  const existing = await prisma.tutor.findUnique({ where: { email } });
  if (existing) return existing;

  return prisma.tutor.upsert({
    where: { email },
    update: {},
    create: { email, name: fullName || email.split('@')[0] },
  });
});

/**
 * Resolves the logged-in Supabase user to their Tutor row. Redirects to /login when there is no
 * session. Every server action and data-loading page must call this and scope queries by the
 * returned tutor id.
 */
export const requireTutor = cache(async () => {
  const tutor = await getTutorOrNull();
  if (!tutor) redirect('/login');
  return tutor;
});

/** Throws unless the student belongs to the tutor and is not archived. */
export async function assertOwnsStudent(tutorId: string, studentId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, tutorId, archivedAt: null },
    select: { id: true },
  });
  if (!student) throw new Error('Student not found.');
}

/** Throws unless the student is enrolled in the course. */
export async function assertEnrolled(studentId: string, courseId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
    select: { id: true },
  });
  if (!enrollment) throw new Error('Student is not enrolled in that course.');
}
