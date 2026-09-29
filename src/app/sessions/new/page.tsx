import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import SessionForm from './SessionForm';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ studentId?: string; sessionId?: string }>;
}

export default async function NewSessionPage({ searchParams }: Props) {
  const { studentId, sessionId } = await searchParams;

  const students = await prisma.student.findMany({
    include: {
      enrollments: {
        include: {
          course: {
            include: {
              topics: {
                orderBy: { code: 'asc' },
              },
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const tools = await prisma.tool.findMany({
    orderBy: { name: 'asc' },
  });

  const formattedStudents = students.map((s) => {
    const primaryEnrollment = s.enrollments[0];
    const rawTopics = primaryEnrollment?.course.topics || [];

    const sortedTopics = [...rawTopics].sort((a, b) =>
      a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' })
    );

    return {
      id: s.id,
      name: s.name,
      courseId: primaryEnrollment?.courseId || '',
      courseTitle: primaryEnrollment?.course.title || 'General Course',
      topics: sortedTopics,
    };
  });

  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#2b2b28] p-6 md:p-10 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-[#ddd8cd] pb-4">
          <div>
            <Link href="/" className="text-xs font-semibold text-[#3d6b52] hover:underline mb-1 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold">
              {sessionId ? 'Complete & Log Scheduled Lesson' : 'Log Session & Evaluate Mastery'}
            </h1>
          </div>
          <span className="text-xs bg-[#e8efe9] text-[#3d6b52] font-semibold px-3 py-1 rounded-full">
            Standard: 90 Mins
          </span>
        </div>

        <SessionForm
          students={formattedStudents}
          tools={tools}
          preselectedStudentId={studentId}
          existingSessionId={sessionId}
        />
      </div>
    </main>
  );
}