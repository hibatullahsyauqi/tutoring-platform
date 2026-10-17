import { prisma } from '@/lib/prisma';
import { requireTutor } from '@/lib/auth';
import Link from 'next/link';
import SessionForm from './SessionForm';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ studentId?: string; sessionId?: string }>;
}

export default async function NewSessionPage({ searchParams }: Props) {
  const tutor = await requireTutor();
  const { studentId, sessionId } = await searchParams;

  const studentsQuery = prisma.student.findMany({
    where: { tutorId: tutor.id, archivedAt: null },
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

  // When completing a scheduled lesson, prefill the form from it instead of "now".
  const scheduledQuery = sessionId
    ? prisma.session.findFirst({
        where: { id: sessionId, status: 'SCHEDULED', student: { tutorId: tutor.id, archivedAt: null } },
      })
    : Promise.resolve(null);

  // Logging from a dossier with no lesson picked: surface any unlogged slot due today or earlier,
  // so a scheduled class isn't logged twice. The tutor can still log a brand-new session.
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const pendingQuery =
    !sessionId && studentId
      ? prisma.session.findMany({
          where: {
            studentId,
            status: 'SCHEDULED',
            sessionDate: { lte: endOfToday },
            student: { tutorId: tutor.id, archivedAt: null },
          },
          orderBy: { sessionDate: 'desc' },
          take: 5,
        })
      : Promise.resolve([]);

  const toolsQuery = prisma.tool.findMany({
    orderBy: { name: 'asc' },
  });

  const [students, scheduled, pendingSessions, tools] = await Promise.all([
    studentsQuery,
    scheduledQuery,
    pendingQuery,
    toolsQuery,
  ]);

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
    <main className="min-h-screen text-[#2b2b28] p-6 md:p-10 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between glass-panel rounded-3xl p-6">
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

        {pendingSessions.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 text-xs">
            <p className="font-bold text-amber-900">
              This student already has a scheduled lesson waiting to be logged. Log that one instead of creating a duplicate?
            </p>
            <div className="flex flex-wrap gap-2">
              {pendingSessions.map((p) => (
                <Link
                  key={p.id}
                  href={`/sessions/new?studentId=${p.studentId}&sessionId=${p.id}`}
                  className="bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-semibold px-3 py-1.5 rounded-lg"
                >
                  Log {p.sessionDate.toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })} →
                </Link>
              ))}
            </div>
            <p className="text-amber-800">Or fill in the form below to log a separate, new session.</p>
          </div>
        )}

        <SessionForm
          students={formattedStudents}
          tools={tools}
          preselectedStudentId={scheduled?.studentId ?? studentId}
          existingSessionId={scheduled ? sessionId : undefined}
          initialSession={
            scheduled
              ? {
                  studentId: scheduled.studentId,
                  sessionDate: scheduled.sessionDate.toISOString(),
                  durationMinutes: scheduled.durationMinutes,
                  sessionType: scheduled.sessionType,
                  meetingUrl: scheduled.meetingUrl ?? '',
                  assignedHomework: scheduled.assignedHomework ?? '',
                  nextFocusTopic: scheduled.nextFocusTopic ?? '',
                }
              : undefined
          }
        />
      </div>
    </main>
  );
}