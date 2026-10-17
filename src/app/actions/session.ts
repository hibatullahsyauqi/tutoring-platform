'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ActivityType, SessionType } from '@prisma/client';
import { assertEnrolled, assertOwnsStudent, requireTutor } from '../../lib/auth';
import { latenessFine } from '../../lib/payroll';
import { createSessionSchema, parseInput } from '../../lib/validation';

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

export async function createSessionAction(input: CreateSessionInput) {
  const data = parseInput(createSessionSchema, input);
  const tutor = await requireTutor();
  await assertOwnsStudent(tutor.id, data.studentId);

  // Guard: You cannot record history before it happens!
  // Allow a 5-minute buffer for local clock differences.
  const sessionTime = new Date(data.sessionDate);
  const maxAllowedTime = new Date(Date.now() + 5 * 60 * 1000);

  if (sessionTime > maxAllowedTime) {
    throw new Error(
      "Cannot log a completed session in the future. To plan an upcoming class in advance, please use the Schedule page."
    );
  }

  // The course comes from the scheduled session when completing one, otherwise from the request.
  let courseId = data.courseId;
  if (data.existingSessionId) {
    const scheduled = await prisma.session.findFirst({
      where: { id: data.existingSessionId, studentId: data.studentId, status: 'SCHEDULED' },
      select: { courseId: true },
    });
    if (!scheduled) throw new Error('That session is not scheduled (it may already be logged).');
    courseId = scheduled.courseId;
  }

  await assertEnrolled(data.studentId, courseId);

  // Every segment must point at a topic of this course.
  const topicIds = [...new Set(data.segments.map((seg) => seg.topicId))];
  if (topicIds.length > 0) {
    const validTopics = await prisma.syllabusTopic.count({
      where: { id: { in: topicIds }, courseId },
    });
    if (validTopics !== topicIds.length) {
      throw new Error('One or more topics do not belong to this course.');
    }
  }

  const fineAmount = latenessFine(data.latenessMinutes);

  const sessionFields = {
    sessionDate: sessionTime,
    durationMinutes: data.durationMinutes,
    sessionType: data.sessionType,
    status: 'COMPLETED' as const,
    meetingUrl: data.meetingUrl || null,
    recordingUrl: data.recordingUrl || null,
    latenessMinutes: data.latenessMinutes,
    fineAmount,
    assignedHomework: data.assignedHomework || null,
    nextFocusTopic: data.nextFocusTopic || null,
  };
  const segmentRows = data.segments.map((seg) => ({
    topicId: seg.topicId,
    toolId: seg.toolId || null,
    durationMinutes: seg.durationMinutes,
    activityType: seg.activityType,
    masteryStatus: seg.masteryStatus,
  }));

  if (data.existingSessionId) {
    const sessionId = data.existingSessionId;
    await prisma.$transaction(async (tx) => {
      // Status-guarded so two concurrent submits cannot both complete (and pay for) one session.
      const { count } = await tx.session.updateMany({
        where: { id: sessionId, studentId: data.studentId, status: 'SCHEDULED' },
        data: sessionFields,
      });
      if (count === 0) throw new Error('That session is not scheduled (it may already be logged).');

      await tx.sessionSegment.deleteMany({ where: { sessionId } });
      await tx.sessionSegment.createMany({
        data: segmentRows.map((row) => ({ ...row, sessionId })),
      });
      await tx.sessionReflection.upsert({
        where: { sessionId },
        create: { sessionId, ...data.reflection },
        update: data.reflection,
      });
    });
  } else {
    await prisma.session.create({
      data: {
        studentId: data.studentId,
        courseId,
        ...sessionFields,
        segments: { create: segmentRows },
        reflection: { create: data.reflection },
      },
    });
  }

  revalidatePath('/schedule');
  revalidatePath('/');
  redirect('/');
}
