'use server';

import { prisma } from '../../lib/prisma';
import { requireTutor } from '../../lib/auth';

export type PaletteStudent = { id: string; name: string; course: string };

/** The tutor's active students, for the quick-jump palette. */
export async function listPaletteStudentsAction(): Promise<PaletteStudent[]> {
  const tutor = await requireTutor();
  const rows = await prisma.student.findMany({
    where: { tutorId: tutor.id, archivedAt: null },
    select: { id: true, name: true, enrollments: { select: { course: { select: { title: true } } }, take: 1 } },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    take: 200,
  });
  return rows.map((r) => ({ id: r.id, name: r.name, course: r.enrollments[0]?.course.title ?? '' }));
}
