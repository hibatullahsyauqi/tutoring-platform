import RefreshButton from '@/components/RefreshButton';
import { prisma } from '@/lib/prisma';
import { requireTutor } from '@/lib/auth';
import Link from 'next/link';
import ScheduleClientView from './ScheduleClientView';
import { absenceFine } from '@/lib/payroll';
import { finalRescheduleTarget, weekOffsetFor, type ChainSession } from '@/lib/reschedule-chain';
import Pagination from '@/components/Pagination';
import { paginate, parsePage } from '@/lib/pagination';

const LIST_PAGE_SIZE = 12;
/** A week never holds more than this many lessons; a hard stop on the query. */
const WEEK_FETCH_CAP = 300;
const MAX_WEEK_OFFSET = 520;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ session?: string; date?: string; week?: string; view?: string; page?: string }>;
}

export default async function SchedulePage({ searchParams }: Props) {
  const tutor = await requireTutor();
  const sp = await searchParams;
  const view: 'week' | 'list' = sp.view === 'list' ? 'list' : 'week';

  // Which week to show: an explicit ?week=, else the week of a deep-linked lesson or date, else now.
  const focusRow =
    sp.session && UUID.test(sp.session)
      ? await prisma.session.findFirst({
          where: { id: sp.session, student: { tutorId: tutor.id, archivedAt: null } },
          select: { id: true, sessionDate: true },
        })
      : null;
  const explicitWeek = Number.isInteger(Number(sp.week)) && sp.week !== undefined && sp.week !== '' ? Number(sp.week) : null;
  const focusDate = sp.date && !Number.isNaN(new Date(sp.date).getTime()) ? new Date(sp.date) : null;
  const weekOffset = Math.max(
    -MAX_WEEK_OFFSET,
    Math.min(
      MAX_WEEK_OFFSET,
      explicitWeek ??
        (focusRow ? weekOffsetFor(focusRow.sessionDate, new Date()) : focusDate ? weekOffsetFor(focusDate, new Date()) : 0)
    )
  );

  // The week's window, padded by a day each side so a timezone difference never drops a lesson.
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + weekOffset * 7);
  const windowStart = new Date(monday);
  windowStart.setDate(windowStart.getDate() - 1);
  const windowEnd = new Date(monday);
  windowEnd.setDate(windowEnd.getDate() + 8);
  const tutorScope = { student: { tutorId: tutor.id, archivedAt: null } };

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
    take: 200,
  });

  // 2. Sessions: one week (calendar view) or one page (list view), never the whole history.
  const sessionInclude = {
    student: true,
    course: { include: { board: true } },
    segments: { include: { topic: true } },
  } as const;

  const listTotal = view === 'list' ? await prisma.session.count({ where: tutorScope }) : 0;
  const listWindow = paginate(parsePage(sp.page), listTotal, LIST_PAGE_SIZE);

  const [students, allSessions] = await Promise.all([
    studentsQuery,
    view === 'list'
      ? prisma.session.findMany({
          where: tutorScope,
          orderBy: [{ sessionDate: 'desc' }, { id: 'asc' }],
          skip: listWindow.skip,
          take: listWindow.take,
          include: sessionInclude,
        })
      : prisma.session.findMany({
          where: { ...tutorScope, sessionDate: { gte: windowStart, lt: windowEnd } },
          orderBy: [{ sessionDate: 'asc' }, { id: 'asc' }],
          take: WEEK_FETCH_CAP,
          include: sessionInclude,
        }),
  ]);

  // Follow reschedule chains for the lessons on screen (a few hops, each one a single query).
  let chainPool: ChainSession[] = allSessions;
  let frontier = allSessions.filter((x) => x.status === 'RESCHEDULED').map((x) => x.id);
  for (let hop = 0; hop < 5 && frontier.length > 0; hop += 1) {
    const next = await prisma.session.findMany({
      where: { rescheduledFromId: { in: frontier }, ...tutorScope },
      select: { id: true, sessionDate: true, status: true, rescheduledFromId: true },
      take: 200,
    });
    chainPool = [...chainPool, ...next];
    frontier = next.filter((x) => x.status === 'RESCHEDULED').map((x) => x.id);
  }

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
      const target = finalRescheduleTarget(s.id, chainPool);
      return target ? { id: target.id, sessionDate: target.sessionDate.toISOString() } : null;
    })(),
    fineAmount: s.fineAmount,
    absenceFineIDR: absenceFine(s.course.level),
    topicsSummary: s.segments.map((seg) => `${seg.topic.code} ${seg.topic.title}`).join(', '),
  }));

  return (
    <main className="min-h-screen text-[#0f172a] p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* HEADER */}
        <header className="md:sticky md:top-3 z-30 glass-panel glass-sticky p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="glass-pill text-[11px] font-bold uppercase tracking-wider px-3 py-1 inline-block">
              Timetable
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a] mt-2">
              Weekly Timetable & Session Schedule
            </h1>
            <p className="text-xs font-medium text-slate-700 mt-0.5">
              Tutoring window: <span className="font-bold text-[#0f172a]">Wed, Thu, Fri (18:30 WIB) & Sat</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <RefreshButton />
            <Link href="/" className="glass-btn">
              ← Dashboard
            </Link>
          </div>
        </header>

        {/* CLIENT CALENDAR VIEW */}
        <ScheduleClientView
          students={formattedStudents}
          sessions={formattedSessions}
          weekOffset={weekOffset}
          view={view}
          totalSessions={view === 'list' ? listWindow.total : formattedSessions.length}
          initialSessionId={focusRow?.id}
          highlightDate={explicitWeek === null && focusDate && sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : undefined}
          listFooter={
            view === 'list' ? (
              <Pagination
                basePath="/schedule"
                params={{ view: 'list' }}
                page={listWindow.page}
                pageCount={listWindow.pageCount}
                total={listWindow.total}
                noun="session"
              />
            ) : null
          }
        />

      </div>
    </main>
  );
}