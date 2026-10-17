'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { SessionStatus, SessionType } from '@prisma/client';
import { assertEnrolled, assertOwnsStudent, requireTutor } from '../../lib/auth';
import { cancelSessionSchema, parseInput, scheduleSessionSchema } from '../../lib/validation';
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
}
