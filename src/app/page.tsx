import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { signOutAction } from '@/app/actions/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
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

  const activeTutor =
    tutor ||
    (await prisma.tutor.create({
      data: {
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split('@')[0],
      },
    }));

  const now = new Date();

  // Monthly Payroll Engine
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth();
  const startOfMonth = new Date(currentYear, currentMonthIndex, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(currentYear, currentMonthIndex + 1, 0, 23, 59, 59, 999);

  const activeMonthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const nextMonthDisbursement = new Date(currentYear, currentMonthIndex + 1, 20);
  const disbursementLabel = nextMonthDisbursement.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const completedSessions = await prisma.session.findMany({
    where: {
      student: { tutorId: activeTutor.id },
      status: 'COMPLETED',
      sessionDate: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    include: { course: true },
  });

  let grossSalary = 0;
  let totalFines = 0;

  completedSessions.forEach((s) => {
    if (s.sessionType === 'TRIAL_CLASS') {
      grossSalary += 60000;
    } else {
      switch (s.course.level) {
        case 'PRIMARY':
          grossSalary += 60000;
          break;
        case 'LOWER_SECONDARY':
        case 'MYP':
          grossSalary += 75000;
          break;
        case 'IGCSE':
          grossSalary += 100000;
          break;
        case 'A_LEVEL':
        case 'DP':
          grossSalary += 150000;
          break;
        default:
          grossSalary += 75000;
      }
    }
    totalFines += s.fineAmount;
  });

  const pphTax = grossSalary * 0.025;
  const netSalary = Math.max(0, grossSalary - pphTax - totalFines);

  // Smart Next Up Briefing
  const nextUpcomingSession = await prisma.session.findFirst({
    where: {
      student: { tutorId: activeTutor.id },
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

  const fallbackRecentSession = await prisma.session.findFirst({
    where: {
      student: { tutorId: activeTutor.id },
      status: 'COMPLETED',
    },
    orderBy: { sessionDate: 'desc' },
    include: {
      student: true,
      course: true,
      reflection: true,
    },
  });

  const students = await prisma.student.findMany({
    where: { tutorId: activeTutor.id },
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
    orderBy: { name: 'asc' },
  });

  return (
    <main className="min-h-screen p-6 md:p-10 font-sans selection:bg-[#0f172a] selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* FROSTED TOPBAR FLOATING ON MOSAIC */}
        <header className="glass-panel rounded-3xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all">
          <div>
            <div className="flex items-center gap-2">
              <span className="glass-pill text-[11px] font-bold uppercase tracking-wider text-[#0f172a] px-3 py-1 rounded-full inline-block">
                Pedagogical OS
              </span>
              <span className="text-[11px] text-slate-600 font-medium">STEM Mosaic Edition</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f172a] mt-2">
              Tutoring Command Center
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Tutor: <span className="font-semibold text-[#0f172a]">{activeTutor.name}</span> · {user.email}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/schedule"
              className="glass-card-subtle hover:bg-white text-[#0f172a] px-3.5 py-2 rounded-xl text-xs font-bold transition-all hover:shadow-xs active:scale-95 inline-flex items-center gap-1.5"
            >
              📅 Schedule
            </Link>
            <Link
              href="/library"
              className="glass-card-subtle hover:bg-white text-[#0f172a] px-3.5 py-2 rounded-xl text-xs font-bold transition-all hover:shadow-xs active:scale-95 inline-flex items-center gap-1.5"
            >
              📚 Library
            </Link>
            <Link
              href="/sessions/new"
              className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-black/20 active:scale-95 inline-flex items-center gap-1.5"
            >
              <span>+</span> Log Session
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-rose-600 hover:bg-rose-50/80 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
              >
                Sign Out
              </button>
            </form>
          </div>
        </header>

        {/* FINANCIAL FLOATING GLASS CARD */}
        <section className="glass-panel rounded-3xl p-6 transition-all space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-black/5 pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {activeMonthName} Earnings Forecast
              </h2>
              <span className="text-[11px] text-[#0f172a] font-semibold">
                Cutoff: 1st – {endOfMonth.getDate()} {activeMonthName} · Payout on {disbursementLabel}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 self-start sm:self-auto font-medium">
              2.5% Tax Withheld
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="glass-card-subtle p-4 rounded-2xl">
              <div className="text-[11px] text-slate-600 font-medium">Completed ({activeMonthName})</div>
              <div className="text-xl font-bold text-[#0f172a] mt-1">{completedSessions.length}</div>
            </div>

            <div className="glass-card-subtle p-4 rounded-2xl">
              <div className="text-[11px] text-slate-600 font-medium">Gross Earnings</div>
              <div className="text-xl font-bold text-[#0f172a] mt-1">
                Rp {grossSalary.toLocaleString('id-ID')}
              </div>
            </div>

            <div className="glass-card-subtle p-4 rounded-2xl">
              <div className="text-[11px] text-slate-600 font-medium">Deductions (Tax + Fines)</div>
              <div className="text-xl font-bold text-rose-600 mt-1">
                -Rp {(pphTax + totalFines).toLocaleString('id-ID')}
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-card-subtle bg-white/90! border-white! shadow-xs">
              <div className="text-[11px] font-bold text-[#0f172a]">Net Due ({disbursementLabel})</div>
              <div className="text-xl font-bold text-emerald-800 mt-1">
                Rp {netSalary.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </section>

        {/* METRICS & SMART BRIEFING */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* SMART PRE-SESSION CONTINUITY BRIEFING */}
          <section className="glass-panel rounded-3xl p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#0f172a]">
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
                  <span className="text-slate-600">
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
                  <div className="p-4 glass-card-subtle rounded-2xl text-xs text-slate-600 text-center">
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
                    <div className="p-3.5 glass-card-subtle border-l-4 border-l-rose-500 rounded-2xl">
                      <span className="font-bold text-rose-700 block mb-0.5">⚠️ Struggle to Revisit (2m Warm-up):</span>
                      <p className="text-[#0f172a] leading-relaxed font-medium">{struggle}</p>
                    </div>
                  )}

                  {homework && (
                    <div className="p-3.5 glass-card-subtle border-l-4 border-l-[#0f172a] rounded-2xl">
                      <span className="font-bold text-[#0f172a] block mb-0.5">📝 Homework to Audit:</span>
                      <p className="text-slate-700 leading-relaxed font-medium">{homework}</p>
                    </div>
                  )}

                  {nextFocus && (
                    <div className="p-3.5 glass-card-subtle bg-white/85! rounded-2xl">
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
                        className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white py-2.5 px-3 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1 active:scale-98"
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
          <section className="md:col-span-2 glass-panel rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Your Active Students
                </h2>
                <span className="glass-pill text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {students.length} Student{students.length !== 1 ? 's' : ''}
                </span>
              </div>

              <Link
                href="/students/new"
                className="glass-card-subtle hover:bg-white text-[#0f172a] text-xs font-bold px-3 py-1.5 rounded-xl border border-black/10 transition-all hover:shadow-xs active:scale-95 inline-flex items-center gap-1"
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

                      <Link
                        href={`/students/${student.id}`}
                        className="glass-card-subtle hover:bg-white text-[#0f172a] text-xs font-bold px-4 py-2 rounded-2xl transition-all border border-black/10 hover:shadow-sm active:scale-95 whitespace-nowrap"
                      >
                        View Dossier →
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>

      </div>
    </main>
  );
}