import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const tutor = await prisma.tutor.findFirst();
  const students = await prisma.student.findMany({
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
          segments: {
            include: {
              topic: true,
              tool: true,
            },
          },
          reflection: true,
        },
      },
    },
  });

  const completedSessions = await prisma.session.findMany({
    where: { status: 'COMPLETED' },
    include: { course: true },
  });

  // Financial Engine
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

  const pphTax = grossSalary * 0.025; // 2.5% withholding tax
  const netSalary = Math.max(0, grossSalary - pphTax - totalFines);

  // Latest session for primary student (e.g. Maya)
  const primaryStudent = students[0];
  const lastSession = primaryStudent?.sessions[0];
  const lastReflection = lastSession?.reflection;

  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#2b2b28] p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="border-b border-[#ddd8cd] pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#3d6b52] bg-[#e8efe9] px-2.5 py-1 rounded-full">
              Pedagogical OS · STEM Tutoring
            </span>
            <h1 className="text-2xl font-bold tracking-tight mt-2">
              Tutoring Dashboard
            </h1>
            <p className="text-sm text-[#6f6b62]">
              Tutor: <span className="font-semibold text-[#2b2b28]">{tutor?.name || 'Syauqi'}</span> · Schedule: Wed, Thu, Fri (18:30 WIB) & Sat
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/sessions/new"
              className="bg-[#3d6b52] hover:bg-[#2d523e] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm inline-flex items-center gap-2"
            >
              <span>+</span> Log New Session
            </Link>
          </div>
        </header>

        {/* FINANCIAL TRACKER */}
        <section className="bg-white border border-[#ddd8cd] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#6f6b62]">
              Monthly Earnings Forecast (Disbursement on the 20th)
            </h2>
            <span className="text-xs text-[#6f6b62]">2.5% Tax Withholding</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-[#faf9f6] rounded-lg">
              <div className="text-xs text-[#6f6b62]">Completed Sessions</div>
              <div className="text-xl font-bold text-[#2b2b28] mt-1">{completedSessions.length}</div>
            </div>

            <div className="p-3 bg-[#faf9f6] rounded-lg">
              <div className="text-xs text-[#6f6b62]">Gross Earnings</div>
              <div className="text-xl font-bold text-[#2b2b28] mt-1">
                Rp {grossSalary.toLocaleString('id-ID')}
              </div>
            </div>

            <div className="p-3 bg-[#faf9f6] rounded-lg">
              <div className="text-xs text-[#6f6b62]">Deductions (Tax + Fines)</div>
              <div className="text-xl font-bold text-[#a3462f] mt-1">
                -Rp {(pphTax + totalFines).toLocaleString('id-ID')}
              </div>
            </div>

            <div className="p-3 bg-[#e8efe9] rounded-lg border border-[#3d6b52]/20">
              <div className="text-xs font-semibold text-[#3d6b52]">Net Payout</div>
              <div className="text-xl font-bold text-[#3d6b52] mt-1">
                Rp {netSalary.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </section>

        {/* METRICS & CONTINUITY BRIEFING */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* LEFT: PRE-SESSION CONTINUITY BRIEFING */}
          <section className="bg-white border border-[#ddd8cd] rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#3d6b52]">
                ⚡ Next Session Warm-up Briefing
              </h2>
              <p className="text-[11px] text-[#6f6b62]">Actionable takeaways from Maya's latest session</p>
            </div>

            {lastSession ? (
              <div className="space-y-3 text-xs">
                {lastReflection?.struggle && (
                  <div className="p-2.5 bg-[#faf9f6] border-l-2 border-[#a3462f] rounded">
                    <span className="font-bold text-[#a3462f] block mb-0.5">⚠️ Struggle to Revisit (2m Warm-up):</span>
                    <p className="text-[#2b2b28] leading-relaxed">{lastReflection.struggle}</p>
                  </div>
                )}

                {lastSession.assignedHomework && (
                  <div className="p-2.5 bg-[#faf9f6] border-l-2 border-[#3d6b52] rounded">
                    <span className="font-bold text-[#3d6b52] block mb-0.5">📝 Assigned Homework to Check:</span>
                    <p className="text-[#2b2b28] leading-relaxed">{lastSession.assignedHomework}</p>
                  </div>
                )}

                {lastSession.nextFocusTopic && (
                  <div className="p-2.5 bg-[#e8efe9] rounded">
                    <span className="font-bold text-[#3d6b52] block mb-0.5">🎯 Next Focus Topic:</span>
                    <p className="text-[#2b2b28] font-medium">{lastSession.nextFocusTopic}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#6f6b62]">No previous session notes yet. Log your first session to trigger automated briefings.</p>
            )}
          </section>

          {/* RIGHT: STUDENT ROSTER */}
          <section className="md:col-span-2 bg-white border border-[#ddd8cd] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#6f6b62]">
                  Active Students
                </h2>
                <span className="text-xs bg-[#e8efe9] text-[#3d6b52] font-semibold px-2 py-0.5 rounded">
                  {students.length} Student{students.length > 1 ? 's' : ''}
                </span>
              </div>

              <Link
                href="/students/new"
                className="text-xs font-bold text-[#3d6b52] hover:underline inline-flex items-center gap-1 bg-[#e8efe9] px-2.5 py-1 rounded-md"
              >
                + Add Student
              </Link>
            </div>

            <div className="divide-y divide-[#ddd8cd]">
              {students.map((student) => {
                const enrollment = student.enrollments[0];
                return (
                  <div key={student.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#2b2b28]">{student.name}</h3>
                      <p className="text-xs text-[#6f6b62] mt-0.5">
                        {enrollment ? (
                          <>
                            <span className="font-medium text-[#2b2b28]">
                              {enrollment.course.title} ({enrollment.course.subjectCode})
                            </span>{' '}
                            · {enrollment.course.board.name}
                          </>
                        ) : (
                          'No active enrollment'
                        )}
                      </p>
                      {student.targetExamDate && (
                        <span className="text-[11px] text-[#3d6b52] bg-[#e8efe9] px-2 py-0.5 rounded mt-1.5 inline-block font-medium">
                          🎯 Target Exam: {new Date(student.targetExamDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/students/${student.id}`}
                      className="text-xs font-semibold text-[#3d6b52] hover:underline bg-[#faf9f6] border border-[#ddd8cd] px-3 py-1.5 rounded-lg"
                    >
                      View Dossier & History →
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>

        </div>

      </div>
    </main>
  );
}