'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ActivityType, SessionType } from '@prisma/client';

export type MasteryStatus = 'STRUGGLING' | 'NEEDS_PRACTICE' | 'MASTERED';

export type CreateSessionInput = {
  existingSessionId?: string; // If completing a pre-scheduled session
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
  // Guard: You cannot record history before it happens!
  // Allow a 5-minute buffer for local clock differences.
  const sessionTime = new Date(data.sessionDate);
  const maxAllowedTime = new Date(Date.now() + 5 * 60 * 1000);

  if (sessionTime > maxAllowedTime) {
    throw new Error(
      "Cannot log a completed session in the future. To plan an upcoming class in advance, please use the Schedule page."
    );
  }

  let fineAmount = 0;
  if (data.latenessMinutes >= 15) {
    fineAmount = Math.floor(data.latenessMinutes / 15) * 10000;
  }

  if (data.existingSessionId) {
    // Update existing scheduled session to COMPLETED
    await prisma.session.update({
      where: { id: data.existingSessionId },
      data: {
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
          deleteMany: {}, // Clear any placeholders
          create: data.segments.map((seg) => ({
            topicId: seg.topicId,
            toolId: seg.toolId || null,
            durationMinutes: seg.durationMinutes,
            activityType: seg.activityType,
            masteryStatus: seg.masteryStatus,
          })),
        },

        reflection: {
          upsert: {
            create: data.reflection,
            update: data.reflection,
          },
        },
      },
    });
  } else {
    // Create new session from scratch
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
  }

  revalidatePath('/schedule');
  revalidatePath('/');
  redirect('/');
}