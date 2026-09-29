'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type CreateStudentInput = {
  name: string;
  courseId: string;
  tier: string;
  targetExamDate?: string;
};

export async function createStudentAction(data: CreateStudentInput) {
  const tutor = await prisma.tutor.findFirst();
  if (!tutor) {
    throw new Error('No active tutor found in database.');
  }

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
  await prisma.student.delete({
    where: { id: studentId },
  });

  revalidatePath('/');
  revalidatePath('/schedule');
  redirect('/');
}