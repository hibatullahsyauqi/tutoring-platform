import { z } from 'zod';
import { ActivityType, ResourceType, SessionStatus, SessionType } from '@prisma/client';

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) => text(max).optional();

const uuid = z.uuid();

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Invalid date.');

/** Empty string means "not provided"; anything else must be an http(s) link, since these render as hrefs. */
const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === '' || /^https?:\/\//i.test(v), 'Links must start with http:// or https://')
  .optional();

const durationMinutes = z.number().int().min(1).max(480);

export const createStudentSchema = z.object({
  name: text(100).min(1, 'Student name is required.'),
  courseId: uuid,
  tier: text(100),
  targetExamDate: isoDate.optional(),
});

export const scheduleSessionSchema = z.object({
  studentId: uuid,
  courseId: uuid,
  sessionDate: isoDate,
  durationMinutes,
  sessionType: z.enum(SessionType),
  meetingUrl: optionalUrl,
  assignedHomework: optionalText(5000),
  nextFocusTopic: optionalText(5000),
});

export const cancelSessionSchema = z.object({
  sessionId: uuid,
  newStatus: z.enum(SessionStatus).refine((s) => s !== 'SCHEDULED' && s !== 'COMPLETED', {
    message: 'A scheduled session can only be cancelled, rescheduled or marked absent.',
  }),
});

export const deleteSessionSchema = z.object({ sessionId: uuid });

export const setBaselineSchema = z.object({
  studentId: uuid,
  topicIds: z.array(uuid).min(1).max(500),
  covered: z.boolean(),
});

export const createSessionSchema = z.object({
  existingSessionId: uuid.optional(),
  studentId: uuid,
  courseId: uuid,
  sessionDate: isoDate,
  durationMinutes,
  sessionType: z.enum(SessionType),
  meetingUrl: optionalUrl,
  recordingUrl: optionalUrl,
  latenessMinutes: z.number().int().min(0).max(600),
  assignedHomework: optionalText(5000),
  nextFocusTopic: optionalText(5000),
  segments: z
    .array(
      z.object({
        topicId: uuid,
        toolId: uuid.optional(),
        durationMinutes: z.number().int().min(0).max(480),
        activityType: z.enum(ActivityType),
        masteryStatus: z.enum(['STRUGGLING', 'NEEDS_PRACTICE', 'MASTERED']),
      })
    )
    .max(50),
  reflection: z.object({
    struggle: optionalText(5000),
    workedWell: optionalText(5000),
    adjustNext: optionalText(5000),
  }),
});

export const createResourceSchema = z.object({
  courseId: uuid,
  topicId: uuid.optional().or(z.literal('')),
  title: text(300).min(1, 'Title is required.'),
  authorOrPublisher: optionalText(300),
  resourceType: z.enum(ResourceType),
  url: optionalUrl,
  locationDetails: optionalText(1000),
});

export const idSchema = uuid;

/** Turns a ZodError into one readable message for the client. */
export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    const where = first.path.length ? `${first.path.join('.')}: ` : '';
    throw new Error(`Invalid input — ${where}${first.message}`);
  }
  return result.data;
}
