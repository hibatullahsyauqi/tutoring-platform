import { prisma } from '@/lib/prisma';
import { requireTutor } from '@/lib/auth';
import Link from 'next/link';
import ScheduleClientView from './ScheduleClientView';
import { absenceFine } from '@/lib/payroll';
import { finalRescheduleTarget, weekOffsetFor } from '@/lib/reschedule-chain';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ session?: string; date?: string }>;
}

export default async function SchedulePage({ searchParams }: Props) {
  const tutor = await requireTutor();
  const { session: focusSessionId, date: focusDate } = await searchParams;

  // 1. Fetch all students under this tutor
  const studentsQuery = prisma.student.findMany({
    where: { tutorId: tutor.id, archivedAt: null },
    include: {
      enrollments: {
        include: {
          course: {
            include: {
              board: true,
            },
          },
        },
      },
      sessions: {
        orderBy: { sessionDate: 'desc' },
        take: 1,
        include: {
          reflection: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  // 2. Fetch all sessions (Scheduled and Completed) to populate the timetable
  const allSessionsQuery = prisma.session.findMany({
    where: {
      student: { tutorId: tutor.id, archivedAt: null },
    },
    include: {
      student: true,
      course: {
        include: {
          board: true,
        },
      },
      segments: {
        include: {
          topic: true,
        },
      },
    },
    orderBy: {
      sessionDate: 'asc',
    },
  });

  const [students, allSessions] = await Promise.all([studentsQuery, allSessionsQuery]);

  const formattedStudents = students.map((s) => ({
    id: s.id,
    name: s.name,
    courseId: s.enrollments[0]?.courseId || '',
    courseTitle: s.enrollments[0]?.course.title || 'General Course',
    subjectCode: s.enrollments[0]?.course.subjectCode || '',
    boardCode: s.enrollments[0]?.course.board.code || '',
    tier: (s.enrollments[0] as any)?.tier || 'Standard',
    lastStruggle: s.sessions[0]?.reflection?.struggle || null,
    lastHomework: s.sessions[0]?.assignedHomework || null,
    lastNextFocus: s.sessions[0]?.nextFocusTopic || null,
  }));

  const formattedSessions = allSessions.map((s) => ({
    id: s.id,
    studentId: s.studentId,
    studentName: s.student.name,
    courseTitle: `${s.course.title} (${s.course.subjectCode})`,
    boardCode: s.course.board.code,
    sessionDate: s.sessionDate.toISOString(),
    durationMinutes: s.durationMinutes,
    sessionType: s.sessionType,
    status: s.status,
    meetingUrl: s.meetingUrl,
    assignedHomework: s.assignedHomework,
    nextFocusTopic: s.nextFocusTopic,
    movedTo: (() => {
      if (s.status !== 'RESCHEDULED') return null;
      const target = finalRescheduleTarget(s.id, allSessions);
      return target ? { id: target.id, sessionDate: target.sessionDate.toISOString() } : null;
    })(),
    fineAmount: s.fineAmount,
    absenceFineIDR: absenceFine(s.course.level),
    topicsSummary: s.segments.map((seg) => `${seg.topic.code} ${seg.topic.title}`).join(', '),
  }));

  // Deep link from the dossier: open the week of the lesson, or of an explicit date.
  const focusSession = focusSessionId ? formattedSessions.find((s) => s.id === focusSessionId) : null;
  const focusTarget = focusSession
    ? new Date(focusSession.sessionDate)
    : focusDate && !Number.isNaN(new Date(focusDate).getTime())
      ? new Date(focusDate)
      : null;
  const initialWeekOffset = focusTarget ? weekOffsetFor(focusTarget, new Date()) : 0;

  return (
    <main className="min-h-screen text-[#0f172a] p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel rounded-3xl p-6">
          <div>
            <Link href="/" className="text-xs font-semibold text-[#3d6b52] hover:underline mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">
              Weekly Timetable & Session Schedule
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Tutoring Window: <span className="font-semibold text-[#0f172a]">Wed, Thu, Fri (18:30 WIB) & Sat</span>
            </p>
          </div>
        </div>

        {/* CLIENT CALENDAR VIEW */}
        <ScheduleClientView
          students={formattedStudents}
          sessions={formattedSessions}
          initialWeekOffset={initialWeekOffset}
          initialSessionId={focusSession?.id}
        />

      </div>
    </main>
  );
}