import type { ActivityType, MasteryStatus, Prisma, ResourceRole } from '@prisma/client';

/**
 * Everything needed to put a deleted lesson back exactly as it was: the lesson itself, its topic
 * blocks, ratings, checklist, reflection and attached resources. Stored as JSON, so dates are
 * ISO strings here.
 */
export type SessionSnapshot = {
  v: 1;
  session: {
    id: string;
    studentId: string;
    courseId: string;
    sessionDate: string;
    durationMinutes: number;
    sessionType: Prisma.SessionUncheckedCreateInput['sessionType'];
    status: Prisma.SessionUncheckedCreateInput['status'];
    meetingUrl: string | null;
    recordingUrl: string | null;
    latenessMinutes: number;
    fineAmount: number;
    assignedHomework: string | null;
    nextFocusTopic: string | null;
    rescheduledFromId: string | null;
  };
  segments: {
    id: string;
    topicId: string;
    toolId: string | null;
    durationMinutes: number;
    activityType: ActivityType;
    masteryStatus: MasteryStatus;
  }[];
  rating: {
    id: string;
    engagement: number;
    understanding: number;
    independence: number;
    tutorClarity: number;
    toolUsefulness: number;
  } | null;
  checklist: {
    id: string;
    solvedCold: boolean;
    recallWarmupDone: boolean;
    studentSummarized: boolean;
    visualToolUsed: boolean;
    interleavedPractice: boolean;
  } | null;
  reflection: { id: string; struggle: string | null; workedWell: string | null; adjustNext: string | null } | null;
  resources: {
    id: string;
    resourceId: string;
    role: ResourceRole;
    customInstructions: string | null;
  }[];
  /** The lesson this one was rescheduled into, if any, so the link can be re-made. */
  replacementId: string | null;
};

type SessionWithParts = Prisma.SessionGetPayload<{
  include: { segments: true; rating: true; checklist: true; reflection: true; resources: true; rescheduledTo: { select: { id: true } } };
}>;

export function snapshotOf(row: SessionWithParts): SessionSnapshot {
  return {
    v: 1,
    session: {
      id: row.id,
      studentId: row.studentId,
      courseId: row.courseId,
      sessionDate: row.sessionDate.toISOString(),
      durationMinutes: row.durationMinutes,
      sessionType: row.sessionType,
      status: row.status,
      meetingUrl: row.meetingUrl,
      recordingUrl: row.recordingUrl,
      latenessMinutes: row.latenessMinutes,
      fineAmount: row.fineAmount,
      assignedHomework: row.assignedHomework,
      nextFocusTopic: row.nextFocusTopic,
      rescheduledFromId: row.rescheduledFromId,
    },
    segments: row.segments.map((s) => ({
      id: s.id,
      topicId: s.topicId,
      toolId: s.toolId,
      durationMinutes: s.durationMinutes,
      activityType: s.activityType,
      masteryStatus: s.masteryStatus,
    })),
    rating: row.rating && {
      id: row.rating.id,
      engagement: row.rating.engagement,
      understanding: row.rating.understanding,
      independence: row.rating.independence,
      tutorClarity: row.rating.tutorClarity,
      toolUsefulness: row.rating.toolUsefulness,
    },
    checklist: row.checklist && {
      id: row.checklist.id,
      solvedCold: row.checklist.solvedCold,
      recallWarmupDone: row.checklist.recallWarmupDone,
      studentSummarized: row.checklist.studentSummarized,
      visualToolUsed: row.checklist.visualToolUsed,
      interleavedPractice: row.checklist.interleavedPractice,
    },
    reflection: row.reflection && {
      id: row.reflection.id,
      struggle: row.reflection.struggle,
      workedWell: row.reflection.workedWell,
      adjustNext: row.reflection.adjustNext,
    },
    resources: row.resources.map((r) => ({
      id: r.id,
      resourceId: r.resourceId,
      role: r.role,
      customInstructions: r.customInstructions,
    })),
    replacementId: row.rescheduledTo?.id ?? null,
  };
}

/** True for a stored payload this code version knows how to restore. */
export function isSnapshot(value: unknown): value is SessionSnapshot {
  const v = value as Partial<SessionSnapshot> | null;
  return !!v && v.v === 1 && !!v.session && typeof v.session.id === 'string' && Array.isArray(v.segments);
}

/**
 * Turns a snapshot back into a create call. `keepRescheduledFrom` is false when the lesson it
 * was rescheduled from has gone, or another lesson has since taken that link.
 */
export function restoreInput(snap: SessionSnapshot, keepRescheduledFrom: boolean): Prisma.SessionUncheckedCreateInput {
  const s = snap.session;
  return {
    id: s.id,
    studentId: s.studentId,
    courseId: s.courseId,
    sessionDate: new Date(s.sessionDate),
    durationMinutes: s.durationMinutes,
    sessionType: s.sessionType,
    status: s.status,
    meetingUrl: s.meetingUrl,
    recordingUrl: s.recordingUrl,
    latenessMinutes: s.latenessMinutes,
    fineAmount: s.fineAmount,
    assignedHomework: s.assignedHomework,
    nextFocusTopic: s.nextFocusTopic,
    rescheduledFromId: keepRescheduledFrom ? s.rescheduledFromId : null,
    segments: { create: snap.segments },
    ...(snap.rating ? { rating: { create: snap.rating } } : {}),
    ...(snap.checklist ? { checklist: { create: snap.checklist } } : {}),
    ...(snap.reflection ? { reflection: { create: snap.reflection } } : {}),
    resources: { create: snap.resources },
  };
}
