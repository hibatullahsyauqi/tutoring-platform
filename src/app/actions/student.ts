'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { assertOwnsStudent, requireTutor } from '../../lib/auth';
import { createStudentSchema, idSchema, parseInput, setBaselineSchema } from '../../lib/validation';

export type CreateStudentInput = {
  name: string;
  courseId: string;
  tier: string;
  targetExamDate?: string;
};

export async function createStudentAction(input: CreateStudentInput) {
  const data = parseInput(createStudentSchema, input);
  const tutor = await requireTutor();

  const student = await prisma.student.create({
    data: {
      name: data.name,
      tutorId: tutor.id,
      targetExamDate: data.targetExamDate ? new Date(data.targetExamDate) : null,
      enrollments: {
        create: {
          courseId: data.courseId,
          tier: data.tier || 'Extended',
        },
      },
    },
  });

  revalidatePath('/');
  redirect(`/students/${student.id}`);
}

export async function deleteStudentAction(studentId: string) {
  parseInput(idSchema, studentId);
  const tutor = await requireTutor();

  // Archive rather than delete: completed sessions are payroll history and must survive.
  const { count } = await prisma.student.updateMany({
    where: { id: studentId, tutorId: tutor.id, archivedAt: null },
    data: { archivedAt: new Date() },
  });
  if (count === 0) throw new Error('Student not found.');

  revalidatePath('/');
  revalidatePath('/schedule');
  return { ok: true as const };
}

export async function restoreStudentAction(studentId: string) {
  parseInput(idSchema, studentId);
  const tutor = await requireTutor();

  const { count } = await prisma.student.updateMany({
    where: { id: studentId, tutorId: tutor.id, archivedAt: { not: null } },
    data: { archivedAt: null },
  });
  if (count === 0) throw new Error('Archived student not found.');

  revalidatePath('/');
  revalidatePath('/schedule');
  return { ok: true as const };
}

export async function setTopicBaselineAction(input: {
  studentId: string;
  topicIds: string[];
  covered: boolean;
}) {
  const data = parseInput(setBaselineSchema, input);
  const tutor = await requireTutor();
  await assertOwnsStudent(tutor.id, data.studentId);

  // Only topics of a course this student is enrolled in can be marked.
  const topicIds = [...new Set(data.topicIds)];
  const valid = await prisma.syllabusTopic.count({
    where: {
      id: { in: topicIds },
      course: { enrollments: { some: { studentId: data.studentId } } },
    },
  });
  if (valid !== topicIds.length) throw new Error('One or more topics are not in this student’s course.');

  if (data.covered) {
    await prisma.studentTopicBaseline.createMany({
      data: topicIds.map((topicId) => ({ studentId: data.studentId, topicId })),
      skipDuplicates: true,
    });
  } else {
    await prisma.studentTopicBaseline.deleteMany({
      where: { studentId: data.studentId, topicId: { in: topicIds } },
    });
  }

  revalidatePath(`/students/${data.studentId}`);
  return { ok: true as const };
}
