import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ScheduleClientView from './ScheduleClientView';

export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect('/login');
  }

  const tutor = await prisma.tutor.findUnique({
    where: { email: user.email },
  });

  if (!tutor) {
    redirect('/login');
  }

  // 1. Fetch all students under this tutor
  const students = await prisma.student.findMany({
    where: { tutorId: tutor.id },
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
  const allSessions = await prisma.session.findMany({
    where: {
      student: { tutorId: tutor.id },
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
    topicsSummary: s.segments.map((seg) => `${seg.topic.code} ${seg.topic.title}`).join(', '),
  }));

  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#2b2b28] p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#ddd8cd] pb-6">
          <div>
            <Link href="/" className="text-xs font-semibold text-[#3d6b52] hover:underline mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-[#2b2b28]">
              Weekly Timetable & Session Schedule
            </h1>
            <p className="text-xs text-[#6f6b62] mt-1">
              Tutoring Window: <span className="font-semibold text-[#2b2b28]">Wed, Thu, Fri (18:30 WIB) & Sat</span>
            </p>
          </div>
        </div>

        {/* CLIENT CALENDAR VIEW */}
        <ScheduleClientView
          students={formattedStudents}
          sessions={formattedSessions}
        />

      </div>
    </main>
  );
}