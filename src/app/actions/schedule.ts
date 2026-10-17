'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { Prisma, SessionStatus, SessionType } from '@prisma/client';
import { assertEnrolled, assertOwnsStudent, assertOwnsStudentIn, requireTutor } from '../../lib/auth';
import {
  cancelSessionSchema,
  deleteSessionSchema,
  parseInput,
  rescheduleSessionSchema,
  scheduleSessionSchema,
} from '../../lib/validation';
import { absenceFine } from '../../lib/payroll';
import { isSnapshot, restoreInput, snapshotOf } from '../../lib/session-snapshot';

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

const TRASH_KEEP_MS = 24 * 60 * 60 * 1000;

/**
 * Deletes a lesson. A full copy goes to the tutor's trash first, and the returned token lets
 * undoDeleteSessionAction put it back exactly as it was.
 */
export async function deleteSessionAction(sessionId: string) {
  const { sessionId: id } = parseInput(deleteSessionSchema, { sessionId });
  const tutor = await requireTutor();

  const trashId = await prisma.$transaction(async (tx) => {
    const row = await tx.session.findFirst({
      where: { id, student: { tutorId: tutor.id } },
      include: {
        segments: true,
        rating: true,
        checklist: true,
        reflection: true,
        resources: true,
        rescheduledTo: { select: { id: true } },
      },
    });
    if (!row) throw new Error('Session not found.');

    // Old copies are only useful for a moment; keep the table small.
    await tx.deletedSession.deleteMany({
      where: { tutorId: tutor.id, deletedAt: { lt: new Date(Date.now() - TRASH_KEEP_MS) } },
    });
    const trash = await tx.deletedSession.create({
      data: { tutorId: tutor.id, payload: snapshotOf(row) as unknown as Prisma.InputJsonValue },
    });

    // Segments, ratings, reflections and resource links cascade with the session.
    await tx.session.delete({ where: { id: row.id } });
    return trash.id;
  });

  revalidatePath('/schedule');
  revalidatePath('/');
  revalidatePath('/students/[id]', 'page');
  return { ok: true as const, undoToken: trashId };
}

/** Brings back a lesson deleted in the last day, from the copy kept when it was deleted. */
export async function undoDeleteSessionAction(undoToken: string) {
  const { sessionId: token } = parseInput(deleteSessionSchema, { sessionId: undoToken });
  const tutor = await requireTutor();

  const trash = await prisma.deletedSession.findFirst({ where: { id: token, tutorId: tutor.id } });
  if (!trash || !isSnapshot(trash.payload)) throw new Error('That deleted lesson can no longer be restored.');
  const snap = trash.payload;

  await prisma.$transaction(async (tx) => {
    await assertOwnsStudentIn(tx, tutor.id, snap.session.studentId);

    // Re-make the reschedule links only where they still make sense.
    const origin = snap.session.rescheduledFromId;
    const originFree = origin
      ? (await tx.session.findUnique({ where: { id: origin }, select: { id: true } })) !== null &&
        (await tx.session.findFirst({ where: { rescheduledFromId: origin }, select: { id: true } })) === null
      : false;

    await tx.session.create({ data: restoreInput(snap, originFree) });

    if (snap.replacementId) {
      await tx.session.updateMany({
        where: { id: snap.replacementId, rescheduledFromId: null },
        data: { rescheduledFromId: snap.session.id },
      });
    }
    await tx.deletedSession.delete({ where: { id: trash.id } });
  });

  revalidatePath('/schedule');
  revalidatePath('/');
  revalidatePath('/students/[id]', 'page');
  return { ok: true as const };
}

/**
 * Moves a scheduled lesson to a new time in one step. The original is kept as RESCHEDULED (no
 * fine, no pay) and a fresh scheduled lesson carries over its link, homework and focus.
 */
export async function rescheduleSessionAction(sessionId: string, newDate: string) {
  const input = parseInput(rescheduleSessionSchema, { sessionId, newDate });
  const tutor = await requireTutor();

  const when = new Date(input.newDate);
  if (when <= new Date()) throw new Error('Pick a time in the future to reschedule to.');

  const original = await prisma.session.findFirst({
    where: { id: input.sessionId, status: 'SCHEDULED', student: { tutorId: tutor.id, archivedAt: null } },
  });
  if (!original) throw new Error('Only a scheduled lesson can be rescheduled.');

  await prisma.$transaction(async (tx) => {
    // Status-guarded so a double click cannot create two replacements.
    const { count } = await tx.session.updateMany({
      where: { id: original.id, status: 'SCHEDULED' },
      data: { status: 'RESCHEDULED', fineAmount: 0 },
    });
    if (count === 0) throw new Error('Only a scheduled lesson can be rescheduled.');

    await tx.session.create({
      data: {
        studentId: original.studentId,
        courseId: original.courseId,
        sessionDate: when,
        durationMinutes: original.durationMinutes,
        sessionType: original.sessionType,
        status: 'SCHEDULED',
        rescheduledFromId: original.id,
        meetingUrl: original.meetingUrl,
        assignedHomework: original.assignedHomework,
        nextFocusTopic: original.nextFocusTopic,
      },
    });
  });

  revalidatePath('/schedule');
  revalidatePath('/');
  revalidatePath('/students/[id]', 'page');
  return { ok: true as const };
}

const REOPENABLE_STATUSES: SessionStatus[] = [
  'COMPLETED',
  'RESCHEDULED',
  'CANCELLED_BY_STUDENT',
  'CANCELLED_WITH_NOTICE',
  'ABSENT_UNNOTIFIED',
];

/**
 * Puts a logged or cancelled lesson back on the schedule, clearing any fine it carried. Reopening
 * a rescheduled lesson removes the replacement it was moved to, as long as that replacement is
 * still just a scheduled slot.
 */
export async function revertSessionToScheduledAction(sessionId: string) {
  const { sessionId: id } = parseInput(deleteSessionSchema, { sessionId });
  const tutor = await requireTutor();

  await prisma.$transaction(async (tx) => {
    const replacement = await tx.session.findFirst({
      where: { rescheduledFromId: id, student: { tutorId: tutor.id } },
      select: { id: true, status: true },
    });
    if (replacement && replacement.status !== 'SCHEDULED') {
      throw new Error(
        'The lesson it was moved to has already been taught or changed. Reopen or delete that one first.'
      );
    }
    if (replacement) await tx.session.delete({ where: { id: replacement.id } });

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
