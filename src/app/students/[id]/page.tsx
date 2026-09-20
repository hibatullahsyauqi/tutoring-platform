import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

const MASTERY_BADGES: Record<string, { label: string; color: string }> = {
  STRUGGLING: { label: '🔴 Struggling', color: 'bg-red-50 text-red-700 border-red-200' },
  NEEDS_PRACTICE: { label: '🟡 Developing', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  MASTERED: { label: '🟢 Mastered', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const DEFAULT_BADGE = {
  label: '🟡 Developing',
  color: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default async function StudentDossierPage({ params }: Props) {
  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: {
          course: {
            include: {
              board: true,
              topics: {
                orderBy: { code: 'asc' },
              },
            },
          },
        },
      },
      sessions: {
        orderBy: { sessionDate: 'desc' },
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

  if (!student) {
    notFound();
  }

  const enrollment = student.enrollments[0];
  const course = enrollment?.course;
  const allTopics = course?.topics || [];
  const tier = (enrollment as any)?.tier || 'Extended';

  // Calculate Syllabus Coverage
  const coveredTopicIds = new Set<string>();
  const masteredTopicIds = new Set<string>();
  const strugglingTopicIds = new Set<string>();

  student.sessions.forEach((s) => {
    s.segments.forEach((seg) => {
      coveredTopicIds.add(seg.topicId);
      if ((seg as any).masteryStatus === 'MASTERED') masteredTopicIds.add(seg.topicId);
      if ((seg as any).masteryStatus === 'STRUGGLING') strugglingTopicIds.add(seg.topicId);
    });
  });

  const totalTopicsCount = allTopics.length;
  const coveredCount = coveredTopicIds.size;
  const coveragePercent = totalTopicsCount > 0 ? Math.round((coveredCount / totalTopicsCount) * 100) : 0;

  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#2b2b28] p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* TOP NAVIGATION & STUDENT HEADER */}
        <div>
          <Link href="/" className="text-xs font-semibold text-[#3d6b52] hover:underline mb-3 inline-block">
            ← Back to Dashboard
          </Link>

          <div className="bg-white border border-[#ddd8cd] rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold tracking-tight text-[#2b2b28]">{student.name}</h1>
                <span className="text-xs font-bold uppercase tracking-wider bg-[#3d6b52]/10 text-[#3d6b52] px-2.5 py-0.5 rounded-full border border-[#3d6b52]/20">
                  {tier} Tier (Papers 2 & 4)
                </span>
              </div>
              <p className="text-xs text-[#6f6b62]">
                <span className="font-semibold text-[#2b2b28]">{course?.title} ({course?.subjectCode})</span> · {course?.board.name}
              </p>
              {student.targetExamDate && (
                <p className="text-[11px] text-[#3d6b52] font-semibold mt-2">
                  🎯 Target Exam Series: {new Date(student.targetExamDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>

            <Link
              href={`/sessions/new?studentId=${student.id}`}
              className="bg-[#3d6b52] hover:bg-[#2d523e] text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm self-start md:self-auto"
            >
              + Log Session for {student.name}
            </Link>
          </div>
        </div>

        {/* SYLLABUS READINESS & METRICS */}
        <section className="bg-white border border-[#ddd8cd] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#6f6b62]">
                Cambridge 0580 Syllabus Coverage
              </h2>
              <p className="text-xs text-[#6f6b62]">Progress across official syllabus points</p>
            </div>
            <span className="text-sm font-bold text-[#3d6b52]">{coveragePercent}% Covered</span>
          </div>

          <div className="w-full bg-[#e8efe9] h-3 rounded-full overflow-hidden">
            <div
              className="bg-[#3d6b52] h-full transition-all duration-500"
              style={{ width: `${coveragePercent}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 text-center pt-2 text-xs">
            <div className="p-2.5 bg-[#faf9f6] rounded-lg border border-[#ddd8cd]/60">
              <div className="text-[11px] text-[#6f6b62]">Covered in Lessons</div>
              <div className="text-base font-bold text-[#2b2b28] mt-0.5">{coveredCount} / {totalTopicsCount}</div>
            </div>
            <div className="p-2.5 bg-[#e8efe9]/50 rounded-lg border border-[#3d6b52]/20">
              <div className="text-[11px] text-[#3d6b52]">Mastered Autonomously</div>
              <div className="text-base font-bold text-[#3d6b52] mt-0.5">{masteredTopicIds.size}</div>
            </div>
            <div className="p-2.5 bg-[#a3462f]/5 rounded-lg border border-[#a3462f]/20">
              <div className="text-[11px] text-[#a3462f]">Active Struggle Points</div>
              <div className="text-base font-bold text-[#a3462f] mt-0.5">{strugglingTopicIds.size}</div>
            </div>
          </div>
        </section>

        {/* CHRONOLOGICAL SESSION HISTORY */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#6f6b62]">
              Learning Journey & Session Timeline
            </h2>
            <span className="text-xs text-[#6f6b62]">
              {student.sessions.length} Recorded Session{student.sessions.length !== 1 ? 's' : ''}
            </span>
          </div>

          {student.sessions.length === 0 ? (
            <div className="bg-white border border-[#ddd8cd] rounded-xl p-8 text-center text-xs text-[#6f6b62]">
              No sessions recorded yet. Use the button above to log your first session with {student.name}.
            </div>
          ) : (
            <div className="space-y-4">
              {student.sessions.map((session) => (
                <article
                  key={session.id}
                  className="bg-white border border-[#ddd8cd] rounded-xl p-5 shadow-sm space-y-4"
                >
                  {/* Session Meta Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#ddd8cd]/50 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#2b2b28]">
                        {new Date(session.sessionDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-[11px] bg-[#faf9f6] border border-[#ddd8cd] px-2 py-0.5 rounded text-[#6f6b62]">
                        {session.durationMinutes} mins
                      </span>
                      <span className="text-[11px] bg-[#e8efe9] text-[#3d6b52] font-semibold px-2 py-0.5 rounded">
                        {session.sessionType.replace('_', ' ')}
                      </span>
                    </div>

                    {session.recordingUrl && (
                      <a
                        href={session.recordingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#3d6b52] hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        📹 Class Recording
                      </a>
                    )}
                  </div>

                  {/* Topics & Activities Covered */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#6f6b62]">
                      Topics & Concept Grasp
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {session.segments.map((seg) => {
                        const mastery = (seg as { masteryStatus?: string }).masteryStatus;
                        const statusBadge = (mastery && MASTERY_BADGES[mastery]) || DEFAULT_BADGE;

                        return (
                          <div
                            key={seg.id}
                            className="p-3 bg-[#faf9f6] border border-[#ddd8cd] rounded-lg text-xs space-y-1"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-[#2b2b28]">
                                {seg.topic.code} {seg.topic.title}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${statusBadge.color}`}>
                                {statusBadge.label}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#6f6b62] flex items-center gap-2 pt-0.5">
                              <span>{seg.durationMinutes}m</span>
                              <span>·</span>
                              <span>{seg.activityType.replace('_', ' ')}</span>
                              {seg.tool && (
                                <>
                                  <span>·</span>
                                  <span className="font-medium text-[#3d6b52]">Tool: {seg.tool.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Continuity Notes */}
                  {session.reflection && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                      {session.reflection.struggle && (
                        <div className="p-3 bg-red-50/50 border border-red-200/60 rounded-lg">
                          <span className="font-bold text-[#a3462f] block mb-1">
                            ⚠️ Stumbling Block (Next Warm-up):
                          </span>
                          <p className="text-[#2b2b28] leading-relaxed">{session.reflection.struggle}</p>
                        </div>
                      )}

                      {session.reflection.workedWell && (
                        <div className="p-3 bg-emerald-50/40 border border-emerald-200/60 rounded-lg">
                          <span className="font-bold text-[#3d6b52] block mb-1">
                            💡 Breakthrough / What Worked:
                          </span>
                          <p className="text-[#2b2b28] leading-relaxed">{session.reflection.workedWell}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Homework & Next Focus */}
                  {(session.assignedHomework || session.nextFocusTopic) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-[#ddd8cd]/40 text-xs">
                      {session.assignedHomework && (
                        <div>
                          <span className="font-bold text-[#6f6b62] block mb-0.5">📝 Assigned Homework:</span>
                          <p className="text-[#2b2b28]">{session.assignedHomework}</p>
                        </div>
                      )}
                      {session.nextFocusTopic && (
                        <div>
                          <span className="font-bold text-[#3d6b52] block mb-0.5">🎯 Next Session Objective:</span>
                          <p className="text-[#2b2b28] font-medium">{session.nextFocusTopic}</p>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}