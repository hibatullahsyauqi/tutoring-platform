'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ActivityType, SessionType } from '@prisma/client';

export type MasteryStatus = 'STRUGGLING' | 'NEEDS_PRACTICE' | 'MASTERED';

export type CreateSessionInput = {
  studentId: string;
  courseId: string;
  sessionDate: string;
  durationMinutes: number;
  sessionType: SessionType;
  meetingUrl?: string;
  recordingUrl?: string;
  latenessMinutes: number;

  assignedHomework?: string;
  nextFocusTopic?: string;

  segments: {
    topicId: string;
    toolId?: string;
    durationMinutes: number;
    activityType: ActivityType;
    masteryStatus: MasteryStatus;
  }[];

  reflection: {
    struggle?: string;
    workedWell?: string;
    adjustNext?: string;
  };
};

export async function createSessionAction(data: CreateSessionInput) {
  let fineAmount = 0;
  if (data.latenessMinutes >= 15) {
    fineAmount = Math.floor(data.latenessMinutes / 15) * 10000;
  }

  await prisma.session.create({
    data: {
      studentId: data.studentId,
      courseId: data.courseId,
      sessionDate: new Date(data.sessionDate),
      durationMinutes: data.durationMinutes,
      sessionType: data.sessionType,
      status: 'COMPLETED',
      meetingUrl: data.meetingUrl || null,
      recordingUrl: data.recordingUrl || null,
      latenessMinutes: data.latenessMinutes,
      fineAmount: fineAmount,
      assignedHomework: data.assignedHomework || null,
      nextFocusTopic: data.nextFocusTopic || null,

      segments: {
        create: data.segments.map((seg) => ({
          topicId: seg.topicId,
          toolId: seg.toolId || null,
          durationMinutes: seg.durationMinutes,
          activityType: seg.activityType,
          masteryStatus: seg.masteryStatus,
        })),
      },

      reflection: {
        create: data.reflection,
      },
    },
  });

  revalidatePath('/');
  redirect('/');
}