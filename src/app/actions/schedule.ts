'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { SessionStatus, SessionType } from '@prisma/client';
import { assertEnrolled, assertOwnsStudent, requireTutor } from '../../lib/auth';
import { cancelSessionSchema, deleteSessionSchema, parseInput, scheduleSessionSchema } from '../../lib/validation';
import { absenceFine } from '../../lib/payroll';

export type ScheduleSessionInput = {
  studentId: string;
  courseId: string;
  sessionDate: string; // ISO datetime
  durationMinutes: number;
  sessionType: SessionType;
  meetingUrl?: string;
  assignedHomework?: string;
  nextFocusTopic?: string;
};

export async function scheduleSessionAction(input: ScheduleSessionInput) {
  const data = parseInput(scheduleSessionSchema, input);
  const tutor = await requireTutor();
  await assertOwnsStudent(tutor.id, data.studentId);
  await assertEnrolled(data.studentId, data.courseId);

  await prisma.session.create({
    data: {
      studentId: data.studentId,
      courseId: data.courseId,
      sessionDate: new Date(data.sessionDate),
      durationMinutes: data.durationMinutes,
      sessionType: data.sessionType,
      status: 'SCHEDULED',
      meetingUrl: data.meetingUrl?.trim() || null,
      assignedHomework: data.assignedHomework?.trim() || null,
      nextFocusTopic: data.nextFocusTopic?.trim() || null,
    },
  });

  revalidatePath('/schedule');
  revalidatePath('/');
  return { ok: true as const };
}

export async function cancelSessionAction(sessionId: string, newStatus: SessionStatus) {
  const input = parseInput(cancelSessionSchema, { sessionId, newStatus });
  const tutor = await requireTutor();

  const session = await prisma.session.findFirst({
    where: { id: input.sessionId, student: { tutorId: tutor.id } },
    include: { course: true },
  });
  if (!session) throw new Error('Session not found.');

  // An unexcused absence can only happen once the lesson time has arrived.
  if (input.newStatus === 'ABSENT_UNNOTIFIED' && session.sessionDate > new Date()) {
    throw new Error('A lesson that has not started yet cannot be marked as an absence.');
  }

  // If absent without notice, contract enforces session fee fine
  const fineAmount =
    input.newStatus === 'ABSENT_UNNOTIFIED' ? absenceFine(session.course.level) : 0;

  // Only a still-scheduled session can be cancelled; a completed one is already payroll history.
  const { count } = await prisma.session.updateMany({
    where: { id: input.sessionId, status: 'SCHEDULED' },
    data: { status: input.newStatus, fineAmount },
  });
  if (count === 0) throw new Error('Only scheduled sessions can be cancelled.');

  revalidatePath('/schedule');
  revalidatePath('/');
  revalidatePath('/students/[id]', 'page');
  return { ok: true as const, fineAmount };
}

export async function deleteSessionAction(sessionId: string) {
  const { sessionId: id } = parseInput(deleteSessionSchema, { sessionId });
  const tutor = await requireTutor();

  // Segments, ratings, reflections and resource links cascade with the session.
  const { count } = await prisma.session.deleteMany({
    where: { id, student: { tutorId: tutor.id } },
  });
  if (count === 0) throw new Error('Session not found.');

  revalidatePath('/schedule');
  revalidatePath('/');
  revalidatePath('/students/[id]', 'page');
  return { ok: true as const };
}

const REOPENABLE_STATUSES: SessionStatus[] = [
  'COMPLETED',
  'CANCELLED_BY_STUDENT',
  'CANCELLED_WITH_NOTICE',
  'ABSENT_UNNOTIFIED',
];

/** Puts a logged or cancelled lesson back on the schedule, clearing any fine it carried. */
export async function revertSessionToScheduledAction(sessionId: string) {
  const { sessionId: id } = parseInput(deleteSessionSchema, { sessionId });
  const tutor = await requireTutor();

  await prisma.$transaction(async (tx) => {
    // Status-guarded: only a logged lesson can be reverted, and only the owner's.
    const { count } = await tx.session.updateMany({
      where: { id, status: { in: REOPENABLE_STATUSES }, student: { tutorId: tutor.id } },
      data: {
        status: 'SCHEDULED',
        latenessMinutes: 0,
        fineAmount: 0,
        recordingUrl: null,
      },
    });
    if (count === 0) throw new Error('Only a logged or cancelled session can be put back on the schedule.');

    await tx.sessionSegment.deleteMany({ where: { sessionId: id } });
    await tx.sessionReflection.deleteMany({ where: { sessionId: id } });
    await tx.sessionRating.deleteMany({ where: { sessionId: id } });
    await tx.sessionChecklist.deleteMany({ where: { sessionId: id } });
  });

  revalidatePath('/schedule');
  revalidatePath('/');
  revalidatePath('/students/[id]', 'page');
  return { ok: true as const };
}
