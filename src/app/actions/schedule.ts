'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { SessionStatus, SessionType } from '@prisma/client';
import { assertOwnsStudent, requireTutor } from '../../lib/auth';
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

export async function scheduleSessionAction(data: ScheduleSessionInput) {
  const tutor = await requireTutor();
  await assertOwnsStudent(tutor.id, data.studentId);

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
  redirect('/schedule');
}

export async function cancelSessionAction(sessionId: string, newStatus: SessionStatus) {
  const tutor = await requireTutor();

  const session = await prisma.session.findFirst({
    where: { id: sessionId, student: { tutorId: tutor.id } },
    include: { course: true },
  });
  if (!session) throw new Error('Session not found.');

  // If absent without notice, contract enforces session fee fine
  const fineAmount = newStatus === 'ABSENT_UNNOTIFIED' ? absenceFine(session.course.level) : 0;

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: newStatus,
      fineAmount,
    },
  });

  revalidatePath('/schedule');
  revalidatePath('/');
}
