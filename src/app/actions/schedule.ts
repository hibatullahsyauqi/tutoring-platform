'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { SessionStatus, SessionType } from '@prisma/client';

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
  // If absent without notice, contract enforces session fee fine
  let fineAmount = 0;
  if (newStatus === 'ABSENT_UNNOTIFIED') {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { course: true },
    });
    // Contract rate lookup
    if (session?.course.level === 'IGCSE') fineAmount = 100000;
    else if (session?.course.level === 'A_LEVEL' || session?.course.level === 'DP') fineAmount = 150000;
    else fineAmount = 75000;
  }

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