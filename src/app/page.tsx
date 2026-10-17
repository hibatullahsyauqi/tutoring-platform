import RefreshButton from '@/components/RefreshButton';
import Pagination from '@/components/Pagination';
import { paginate, parsePage, type PageWindow } from '@/lib/pagination';
import { prisma } from '@/lib/prisma';
import { requireTutor } from '@/lib/auth';
import { computePayroll, monthBounds, nextDisbursementDate } from '@/lib/payroll';
import Link from 'next/link';
import { getLiveExchangeRates } from '@/lib/currency';
import FinancialGlassCard from '@/components/FinancialGlassCard';
import DeleteStudentButton from '@/components/DeleteStudentButton';
import RestoreStudentButton from '@/components/RestoreStudentButton';

export const dynamic = 'force-dynamic';

const STUDENT_PAGE_SIZE = 8;
const ARCHIVED_PAGE_SIZE = 6;

interface Props {
  searchParams: Promise<{ page?: string; apage?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const sp = await searchParams;
  const activeTutor = await requireTutor();

  const now = new Date();

  // Fetch live exchange rates (Cached & updated hourly via Next.js)
  const ratesQuery = getLiveExchangeRates();

  // Monthly Payroll Calculations
  const { start: startOfMonth, end: endOfMonth } = monthBounds(now);

  const activeMonthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const nextMonthDisbursement = nextDisbursementDate(now);
  const disbursementLabel = nextMonthDisbursement.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const payrollQuery = prisma.session.findMany({
    where: {
      student: { tutorId: activeTutor.id },
      status: { in: ['COMPLETED', 'ABSENT_UNNOTIFIED'] },
      sessionDate: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    include: { course: true },
  });

  // Smart Next Up Briefing
  const nextUpcomingQuery = prisma.session.findFirst({
    where: {
      student: { tutorId: activeTutor.id, archivedAt: null },
      status: 'SCHEDULED',
      sessionDate: { gte: now },
    },
    orderBy: { sessionDate: 'asc' },
    include: {
      student: {
        include: {
          sessions: {
            where: { status: 'COMPLETED' },
            orderBy: { sessionDate: 'desc' },
            take: 1,
            include: { reflection: true },
          },
        },
      },
      course: true,
    },
  });

  const fallbackQuery = prisma.session.findFirst({
    where: {
      student: { tutorId: activeTutor.id, archivedAt: null },
      status: 'COMPLETED',
    },
    orderBy: { sessionDate: 'desc' },
    include: {
      student: true,
      course: true,
      reflection: true,
    },
  });

  const studentCountQuery = prisma.student.count({ where: { tutorId: activeTutor.id, archivedAt: null } });
  const archivedCountQuery = prisma.student.count({
    where: { tutorId: activeTutor.id, archivedAt: { not: null } },
  });

  const studentsQuery = (window: PageWindow) => prisma.student.findMany({
    where: { tutorId: activeTutor.id, archivedAt: null },
    skip: window.skip,
    take: window.take,
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
    },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  });

  const archivedQuery = (window: PageWindow) => prisma.student.findMany({
    where: { tutorId: activeTutor.id, archivedAt: { not: null } },
    skip: window.skip,
    take: window.take,
    select: {
      id: true,
      name: true,
      archivedAt: true,
      enrollments: { select: { course: { select: { title: true, subjectCode: true } } }, take: 1 },
    },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  });

  // Independent reads run together instead of one round trip after another. The student lists
  // are read one page at a time, so the counts come first.
  const [
    { rates, lastUpdated, isLive },
    payrollSessions,
    nextUpcomingSession,
    fallbackRecentSession,
    studentTotal,
    archivedTotal,
  ] = await Promise.all([
    ratesQuery,
    payrollQuery,
    nextUpcomingQuery,
    fallbackQuery,
    studentCountQuery,
    archivedCountQuery,
  ]);

  const studentWindow = paginate(parsePage(sp.page), studentTotal, STUDENT_PAGE_SIZE);
  const archivedWindow = paginate(parsePage(sp.apage), archivedTotal, ARCHIVED_PAGE_SIZE);
  const [students, archivedStudents] = await Promise.all([
    studentsQuery(studentWindow),
    archivedQuery(archivedWindow),
  ]);

  const { grossSalary, pphTax, totalFines, totalDeductions, netSalary } = computePayroll(payrollSessions);

  return (
    <main className="min-h-screen p-6 md:p-10 font-sans selection:bg-[#0f172a] selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* FROSTED TOPBAR */}
        <header className="md:sticky md:top-3 z-30 glass-panel glass-sticky p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="glass-pill text-[11px] font-bold uppercase tracking-wider text-[#0f172a] px-3 py-1 rounded-full inline-block">
                Pedagogical Dashboard
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a] mt-2">
              Tutoring Command Center
            </h1>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              Tutor: <span className="font-bold text-[#0f172a]">{activeTutor.name}</span> · {activeTutor.email}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <RefreshButton />
            <Link
              href="/schedule"
              className="glass-btn inline-flex items-center"
            >
              📅 Schedule
            </Link>
            <Link
              href="/library"
              className="glass-btn inline-flex items-center"
            >
              📚 Library
            </Link>
            <Link
              href="/sessions/new"
              className="glass-btn glass-btn-primary"
            >
              <span>+</span> Log Session
            </Link>
          </div>
        </header>

        {/* MULTI-CURRENCY FINANCIAL GLASS CARD */}
        <FinancialGlassCard
          activeMonthName={activeMonthName}
          endOfMonthDay={endOfMonth.getDate()}
          disbursementLabel={disbursementLabel}
          completedCount={payrollSessions.filter((s) => s.status === 'COMPLETED').length}
          grossSalaryIDR={grossSalary}
          pphTaxIDR={pphTax}
          totalFinesIDR={totalFines}
          totalDeductionsIDR={totalDeductions}
          netSalaryIDR={netSalary}
          rates={rates}
          ratesUpdated={lastUpdated}
          ratesAreLive={isLive}
        />

        {/* METRICS & SMART BRIEFING */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* SMART PRE-SESSION CONTINUITY BRIEFING */}
          <section className="glass-panel p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#0f172a]">
                  ⚡ Pre-Session Briefing
                </h2>
                {nextUpcomingSession ? (
                  <span className="glass-pill text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    Next Up
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-500">
                    Latest Class
                  </span>
                )}
              </div>

              {nextUpcomingSession ? (
                <p className="text-xs font-bold text-[#0f172a] mt-1.5">
                  {nextUpcomingSession.student.name} ·{' '}
                  <span className="text-slate-600 font-medium">
                    {new Date(nextUpcomingSession.sessionDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    at{' '}
                    {new Date(nextUpcomingSession.sessionDate).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}{' '}
                    WIB
                  </span>
                </p>
              ) : fallbackRecentSession ? (
                <p className="text-xs font-bold text-[#0f172a] mt-1.5">
                  {fallbackRecentSession.student.name} · Most recent class
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1.5">No upcoming or recent sessions.</p>
              )}
            </div>

            {(() => {
              const sessionContext = nextUpcomingSession
                ? nextUpcomingSession.student.sessions[0]
                : fallbackRecentSession;

              if (!sessionContext) {
                return (
                  <div className="p-4 glass-card-subtle text-xs text-slate-600 text-center">
                    No continuity notes recorded yet.
                  </div>
                );
              }

              const struggle = sessionContext.reflection?.struggle;
              const homework = sessionContext.assignedHomework;
              const nextFocus = sessionContext.nextFocusTopic;

              return (
                <div className="space-y-3 text-xs">
                  {struggle && (
                    <div className="p-4 glass-card-subtle border-l-4 border-l-rose-500">
                      <span className="font-bold text-rose-700 block mb-0.5">⚠️ Struggle to Revisit (2m Warm-up):</span>
                      <p className="text-[#0f172a] leading-relaxed font-medium">{struggle}</p>
                    </div>
                  )}

                  {homework && (
                    <div className="p-4 glass-card-subtle border-l-4 border-l-[#0f172a]">
                      <span className="font-bold text-[#0f172a] block mb-0.5">📝 Homework to Audit:</span>
                      <p className="text-slate-700 leading-relaxed font-medium">{homework}</p>
                    </div>
                  )}

                  {nextFocus && (
                    <div className="p-4 glass-card-subtle bg-white/85!">
                      <span className="font-bold text-[#0f172a] block mb-0.5">🎯 Planned Target:</span>
                      <p className="text-[#0f172a] font-bold">{nextFocus}</p>
                    </div>
                  )}

                  {nextUpcomingSession?.meetingUrl && (
                    <div className="pt-1">
                      <a
                        href={nextUpcomingSession.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="glass-btn glass-btn-primary w-full"
                      >
                        Launch Meeting ↗
                      </a>
                    </div>
                  )}
                </div>
              );
            })()}
          </section>

          {/* ACTIVE STUDENTS ROSTER */}
          <section className="md:col-span-2 glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-[#0f172a]">
                  Active Students
                </h2>
                <span className="glass-pill text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {studentTotal} Student{studentTotal !== 1 ? 's' : ''}
                </span>
              </div>

              <Link
                href="/students/new"
                className="glass-btn inline-flex items-center glass-btn-sm"
              >
                + Add Student
              </Link>
            </div>

            {students.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-2xl">
                No active students yet. Click <strong>+ Add Student</strong> to onboard your first pupil.
              </div>
            ) : (
              <div className="divide-y divide-black/5">
                {students.map((student) => {
                  const enrollment = student.enrollments[0];
                  return (
                    <div key={student.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold text-[#0f172a]">{student.name}</h3>
                        <p className="text-xs text-slate-600 mt-0.5 font-medium">
                          {enrollment ? (
                            <>
                              <span className="font-semibold text-[#0f172a]">
                                {enrollment.course.title} ({enrollment.course.subjectCode})
                              </span>{' '}
                              · {enrollment.course.board.name}
                            </>
                          ) : (
                            'No active enrollment'
                          )}
                        </p>
                        {student.targetExamDate && (
                          <span className="glass-pill text-[11px] px-2.5 py-0.5 rounded-md mt-2 inline-block font-semibold">
                            🎯 Target Exam: {new Date(student.targetExamDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col items-stretch gap-2">
                        <Link
                          href={`/students/${student.id}`}
                          className="glass-btn whitespace-nowrap text-center"
                        >
                          View Dossier →
                        </Link>
                        <DeleteStudentButton studentId={student.id} studentName={student.name} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Pagination
              basePath="/"
              params={{ apage: sp.apage }}
              page={studentWindow.page}
              pageCount={studentWindow.pageCount}
              total={studentWindow.total}
              noun="student"
            />
          </section>

          {archivedTotal > 0 && (
            <section className="md:col-span-3 glass-panel p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-black/5 pb-3">
                <h2 className="text-base font-bold text-[#0f172a]">Archived Students</h2>
                <span className="glass-pill text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {archivedTotal}
                </span>
                <span className="text-xs text-slate-500 ml-1">Hidden from the dashboard and schedule. Payroll history is kept.</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {archivedStudents.map((s) => {
                  const course = s.enrollments[0]?.course;
                  return (
                    <div key={s.id} className="glass-card-subtle border border-black/10 p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[#0f172a] truncate">{s.name}</h3>
                        <p className="text-xs text-slate-600 truncate">
                          {course ? `${course.title} (${course.subjectCode})` : 'No enrollment'}
                        </p>
                        {s.archivedAt && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Archived {s.archivedAt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <RestoreStudentButton studentId={s.id} />
                    </div>
                  );
                })}
              </div>
              <Pagination
                basePath="/"
                params={{ page: sp.page }}
                pageParam="apage"
                page={archivedWindow.page}
                pageCount={archivedWindow.pageCount}
                total={archivedWindow.total}
                noun="archived student"
              />
            </section>
          )}

        </div>

      </div>
    </main>
  );
}