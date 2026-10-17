'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireTutor } from '../../lib/auth';

export type CreateStudentInput = {
  name: string;
  courseId: string;
  tier: string;
  targetExamDate?: string;
};

export async function createStudentAction(data: CreateStudentInput) {
  const tutor = await requireTutor();

  const student = await prisma.student.create({
    data: {
      name: data.name.trim(),
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
  // Cascades automatically to enrollments, sessions, segments, and reflections in Supabase
  const tutor = await requireTutor();
  const { count } = await prisma.student.deleteMany({
    where: { id: studentId, tutorId: tutor.id },
  });
  if (count === 0) throw new Error('Student not found.');

  revalidatePath('/');
  revalidatePath('/schedule');
  redirect('/');
}