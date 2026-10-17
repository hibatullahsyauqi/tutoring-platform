import RevertSessionButton from '@/components/RevertSessionButton';
import DeleteSessionButton from '@/components/DeleteSessionButton';
import { prisma } from '@/lib/prisma';
import { requireTutor } from '@/lib/auth';
import Link from 'next/link';
import SyllabusMap from '@/components/SyllabusMap';
import ProgressInsights from '@/components/ProgressInsights';
import { finalRescheduleTarget, reopenMessage } from '@/lib/reschedule-chain';
import { computeExamPace } from '@/lib/exam-pace';
import { monthlyMomentum } from '@/lib/momentum';
import { matchesView, parseTimelineView, TIMELINE_PAGE_SIZE, TIMELINE_VIEWS } from '@/lib/timeline';
import { computeTopicProgress, suggestNext } from '@/lib/syllabus-progress';
import { notFound } from 'next/navigation';
import CopyPresenceButton from '@/components/CopyPresenceButton';
import DeleteStudentButton from '@/components/DeleteStudentButton';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; show?: string }>;
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

function getSheetType(sessionType: string, boardCode?: string): string {
  if (sessionType === 'TRIAL_CLASS') {
    if (boardCode === 'NEGERI') return 'Negeri Trials';
    return 'Cambridge/ Adaptive Trial';
  }
  if (
    sessionType === 'REGULAR_LESSON' ||
    sessionType === 'CONCEPT_INTRO' ||
    sessionType === 'REVISION_RECALL' ||
    sessionType === 'EXAM_SIMULATION' ||
    sessionType === 'HOMEWORK_HELP'
  ) {
    return 'Class';
  }
  return 'Others';
}

function getSheetGrade(subjectCode?: string, level?: string, boardCode?: string): string {
  if (subjectCode === '0606') return 'Additional Math';
  if (boardCode === 'NEGERI') {
    if (level === 'PRIMARY') return 'Negeri SD';
    if (level === 'LOWER_SECONDARY') return 'Negeri SMP';
    return 'Negeri SMA';
  }
  if (level === 'IGCSE') return 'IGCSE';
  if (level === 'A_LEVEL' || level === 'DP' || subjectCode === 'SAT-MATH') {
    return 'A level / AS Level';
  }
  if (level === 'LOWER_SECONDARY' || level === 'MYP') return 'Level 7, 8, 9';
  if (level === 'PRIMARY') return 'Level 1 - 6';
  return 'IGCSE';
}

function getSheetSubject(title?: string): string {
  const t = (title || '').toLowerCase();
  if (t.includes('physics')) return 'Physics';
  if (t.includes('biology')) return 'Biology';
  if (t.includes('chemistry')) return 'Chemistry';
  if (t.includes('science')) return 'Science';
  if (t.includes('accounting')) return 'Accounting';
  if (t.includes('english')) return 'English';
  return 'Math';
}

function getSheetPlace(): string {
  return 'Online';
}

export default async function StudentDossierPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { view: viewParam, show } = await searchParams;
  const view = parseTimelineView(viewParam);
  const tutor = await requireTutor();

  const student = await prisma.student.findUnique({
    where: { id, tutorId: tutor.id, archivedAt: null },
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
      baselineTopics: { select: { topicId: true } },
      sessions: {
        orderBy: { sessionDate: 'asc' },
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

  const priorTopicIds = new Set(student.baselineTopics.map((b) => b.topicId));
  const topicProgress = computeTopicProgress(
    allTopics,
    student.sessions.map((s) => ({
      sessionDate: s.sessionDate,
      status: s.status,
      segments: s.segments.map((seg) => ({
        topicId: seg.topicId,
        masteryStatus: seg.masteryStatus,
      })),
    })),
    new Date(),
    priorTopicIds
  );
  const suggestions = suggestNext(topicProgress);
  const progressSessions = student.sessions.map((s) => ({
    sessionDate: s.sessionDate,
    status: s.status,
    segments: s.segments.map((seg) => ({ topicId: seg.topicId, masteryStatus: seg.masteryStatus })),
  }));
  const examPace = computeExamPace(student.targetExamDate, new Date(), topicProgress, progressSessions);
  const momentum = monthlyMomentum(progressSessions, new Date());

  const totalTopicsCount = allTopics.length;
  priorTopicIds.forEach((id) => coveredTopicIds.add(id));
  const coveredCount = coveredTopicIds.size;
  const coveragePercent = totalTopicsCount > 0 ? Math.round((coveredCount / totalTopicsCount) * 100) : 0;

  // Only lessons that actually happened get a meeting number (it feeds the attendance sheet).
  const completedCount = student.sessions.filter((s) => s.status === 'COMPLETED').length;
  const chronologicalSessions = student.sessions.map((s, idx) => {
    const label =
      s.status === 'COMPLETED'
        ? `Meeting ${student.sessions.slice(0, idx + 1).filter((x) => x.status === 'COMPLETED').length}`
        : s.status === 'SCHEDULED'
          ? new Date(s.sessionDate) <= new Date()
            ? 'Needs log'
            : 'Upcoming'
          : s.status === 'ABSENT_UNNOTIFIED'
            ? 'Absent'
            : s.status === 'RESCHEDULED'
              ? 'Rescheduled'
              : 'Cancelled';
    const movedTo =
      s.status === 'RESCHEDULED' ? finalRescheduleTarget(s.id, student.sessions) : null;
    return { ...s, meetingNumber: label, movedTo };
  });
  const filteredSessions = [...chronologicalSessions]
    .reverse()
    .filter((s) => matchesView(s.status, view));
  const showAll = show === 'all';
  const displaySessions = showAll ? filteredSessions : filteredSessions.slice(0, TIMELINE_PAGE_SIZE);
  const hiddenCount = filteredSessions.length - displaySessions.length;
  const viewHref = (v: string, all = false) => {
    const q = new URLSearchParams();
    if (v !== 'all') q.set('view', v);
    if (all) q.set('show', 'all');
    const qs = q.toString();
    return `/students/${student.id}${qs ? `?${qs}` : ''}`;
  };

  return (
    <main className="min-h-screen text-[#0f172a] p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* HEADER WITH DELETE BUTTON */}
        <div>
          <div className="glass-panel p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <Link href="/" className="text-xs font-semibold text-[#2d523e] hover:underline mb-2 inline-block">
                  ← Back to Dashboard
                </Link>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">{student.name}</h1>
                <span className="glass-pill text-xs font-bold uppercase tracking-wider px-2.5 py-0.5">
                  {tier} Tier
                </span>
              </div>
              <p className="text-xs text-slate-600">
                <span className="font-semibold text-[#0f172a]">{course?.title} ({course?.subjectCode})</span> · {course?.board.name}
              </p>
              {student.targetExamDate && (
                <p className="text-[11px] text-[#2d523e] font-semibold mt-2">
                  🎯 Target Exam Series: {new Date(student.targetExamDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <Link
                href="/schedule"
                className="glass-btn glass-btn-sm"
              >
                📅 Open Timetable
              </Link>
              <DeleteStudentButton studentId={student.id} studentName={student.name} />
              <Link
                href={`/sessions/new?studentId=${student.id}`}
                className="glass-btn glass-btn-primary"
              >
                + Log Session
              </Link>
            </div>
          </div>
        </div>

        {/* SYLLABUS READINESS */}
        <section className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#0f172a]">
                {course?.title} Syllabus Coverage
              </h2>
              <p className="text-xs text-slate-600">Progress across official syllabus points</p>
            </div>
            <span className="text-sm font-bold text-[#2d523e]">{coveragePercent}% Covered</span>
          </div>

          <div className="w-full bg-white/40 shadow-inner h-3 rounded-full overflow-hidden">
            <div
              className="bg-[#3d6b52] h-full transition-all duration-500"
              style={{ width: `${coveragePercent}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 text-center pt-2 text-xs">
            <div className="p-3 glass-inset">
              <div className="text-[11px] text-slate-600">Covered or Known</div>
              <div className="text-base font-bold text-[#0f172a] mt-0.5">{coveredCount} / {totalTopicsCount}</div>
            </div>
            <div className="p-3 glass-inset">
              <div className="text-[11px] text-[#2d523e]">Mastered Autonomously</div>
              <div className="text-base font-bold text-[#2d523e] mt-0.5">{masteredTopicIds.size}</div>
            </div>
            <div className="p-3 glass-inset">
              <div className="text-[11px] text-[#a3462f]">Active Struggle Points</div>
              <div className="text-base font-bold text-[#a3462f] mt-0.5">{strugglingTopicIds.size}</div>
            </div>
          </div>
        </section>

        <ProgressInsights pace={examPace} momentum={momentum} />

        <SyllabusMap
          studentId={student.id}
          courseTitle={course?.title ?? 'this course'}
          progress={topicProgress}
          suggestions={suggestions}
        />

        {/* CHRONOLOGICAL SESSION TIMELINE */}
        <section className="space-y-4">
          <div className="glass-panel flex items-center justify-between p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0f172a]">
              Learning Journey & Session Timeline
            </h2>
            <span className="text-xs text-slate-600">
              {completedCount} Recorded Session{completedCount !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="glass-panel flex flex-wrap gap-2 p-4">
            {TIMELINE_VIEWS.map((v) => (
              <Link
                key={v.value}
                href={viewHref(v.value)}
                className={`glass-btn glass-btn-sm  ${
                  view === v.value
                    ? 'glass-btn-primary'
                    : ''
                } `}
              >
                {v.label}
              </Link>
            ))}
          </div>

          {displaySessions.length === 0 ? (
            <div className="glass-panel p-8 text-center text-xs text-slate-600">
              {student.sessions.length === 0
                ? `No sessions recorded yet. Use the button above to log your first session with ${student.name}.`
                : 'No sessions match this filter.'}
            </div>
          ) : (
            <div className="space-y-4">
              {displaySessions.map((session) => {
                const sDate = new Date(session.sessionDate);
                const day = String(sDate.getDate()).padStart(2, '0');
                const month = String(sDate.getMonth() + 1).padStart(2, '0');
                const year = sDate.getFullYear();
                const formattedDate = `${day}/${month}/${year}`;

                const primaryTopicTitle = session.segments[0]?.topic?.title
                  ? `${session.segments[0].topic.code} ${session.segments[0].topic.title}`
                  : session.segments[0]?.activityType || 'Lesson';

                const presencePayload = {
                  date: formattedDate,
                  meetingNumber: session.meetingNumber,
                  sessionType: getSheetType(session.sessionType, course?.board.code),
                  grade: getSheetGrade(course?.subjectCode, course?.level, course?.board.code),
                  subject: getSheetSubject(course?.title),
                  place: getSheetPlace(),
                  notes: primaryTopicTitle,
                };

                return (
                  <article
                    key={session.id}
                    className="glass-panel p-6 space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-black/10 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="glass-chip text-xs font-bold text-[#2d523e] px-2 py-0.5">
                          {session.meetingNumber}
                        </span>
                        <span className="text-xs font-bold text-[#0f172a]">
                          {sDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          {sDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}
                          {'–'}
                          {new Date(sDate.getTime() + session.durationMinutes * 60000).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Asia/Jakarta',
                          })}{' '}
                          WIB
                        </span>
                        <span className="text-[11px] px-2 py-0.5 text-slate-600 glass-chip">
                          {session.durationMinutes} mins
                        </span>
                        <span className="text-[11px] px-2 py-0.5 text-slate-600 glass-chip">
                          {session.sessionType.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {session.recordingUrl && (
                          <a
                            href={session.recordingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-[#2d523e] hover:underline inline-flex items-center gap-1 font-medium"
                          >
                            📹 Recording
                          </a>
                        )}

                        {session.status === 'SCHEDULED' && new Date(session.sessionDate) <= new Date() && (
                          <Link
                            href={`/sessions/new?studentId=${student.id}&sessionId=${session.id}`}
                            className="glass-btn glass-btn-danger-solid glass-btn-sm"
                          >
                            Log Lesson →
                          </Link>
                        )}
                        <Link
                          href={`/schedule?session=${session.id}`}
                          className="glass-btn glass-btn-sm"
                        >
                          📅 Timetable
                        </Link>
                        {session.fineAmount > 0 && (
                          <span className="glass-badge text-[#a3462f] bg-red-50 border-red-200">
                            Fine Rp {session.fineAmount.toLocaleString('id-ID')}
                          </span>
                        )}
                        {session.status === 'COMPLETED' && (
                          <>
                            <CopyPresenceButton payload={presencePayload} />
                            <RevertSessionButton sessionId={session.id} />
                          </>
                        )}
                        {session.status !== 'COMPLETED' && session.status !== 'SCHEDULED' && (
                          <RevertSessionButton
                            sessionId={session.id}
                            label="Reopen"
                            message={reopenMessage({
                              fineAmount: session.fineAmount,
                              movedToLabel: session.movedTo
                                ? session.movedTo.sessionDate.toLocaleString('en-GB', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    timeZone: 'Asia/Jakarta',
                                  }) + ' WIB'
                                : null,
                            })}
                          />
                        )}
                        <DeleteSessionButton
                          sessionId={session.id}
                          completed={session.status === 'COMPLETED'}
                          className="glass-btn glass-btn-danger glass-btn-sm"
                        />
                      </div>
                    </div>

                    {session.status === 'RESCHEDULED' && (
                      <div className="p-3 text-xs glass-inset">
                        {session.movedTo ? (
                          <>
                            <span className="font-bold text-slate-600">Rescheduled to </span>
                            <Link
                              href={`/schedule?session=${session.movedTo.id}`}
                              className="font-semibold text-[#2d523e] hover:underline"
                            >
                              {session.movedTo.sessionDate.toLocaleString('en-GB', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Asia/Jakarta',
                              })}{' '}
                              WIB →
                            </Link>
                          </>
                        ) : (
                          <span className="text-slate-600">Rescheduled. The new lesson no longer exists.</span>
                        )}
                      </div>
                    )}

                    {session.status === 'SCHEDULED' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="p-3 space-y-0.5 glass-inset">
                          <span className="font-bold text-slate-600 block">Course</span>
                          <span className="text-[#0f172a]">{course?.title ?? 'General Course'}</span>
                        </div>
                        <div className="p-3 space-y-0.5 glass-inset">
                          <span className="font-bold text-slate-600 block">Meeting Link</span>
                          {session.meetingUrl ? (
                            <a
                              href={session.meetingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#2d523e] font-semibold hover:underline break-all"
                            >
                              Join call ↗
                            </a>
                          ) : (
                            <span className="text-slate-600">Not set</span>
                          )}
                        </div>
                      </div>
                    )}

                    {session.status === 'COMPLETED' && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        Topics & Concept Grasp
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {session.segments.map((seg) => {
                          const mastery = (seg as any).masteryStatus;
                          const statusBadge = (mastery && MASTERY_BADGES[mastery]) || DEFAULT_BADGE;

                          return (
                            <div
                              key={seg.id}
                              className="p-3 text-xs space-y-1 glass-inset"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-[#0f172a]">
                                  {seg.topic ? `${seg.topic.code} ${seg.topic.title}` : 'General Exploration'}
                                </span>
                                <span className={`glass-badge flex-shrink-0 ${statusBadge.color}`}>
                                  {statusBadge.label}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600 flex items-center gap-2 pt-0.5">
                                <span>{seg.durationMinutes}m</span>
                                <span>·</span>
                                <span>{seg.activityType.replace('_', ' ')}</span>
                                {seg.tool && (
                                  <>
                                    <span>·</span>
                                    <span className="font-medium text-[#2d523e]">Tool: {seg.tool.name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    )}

                    {session.reflection && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                        {session.reflection.struggle && (
                          <div className="glass-inset p-3">
                            <span className="font-bold text-[#a3462f] block mb-1">
                              ⚠️ Stumbling Block (Next Warm-up):
                            </span>
                            <p className="text-[#0f172a] leading-relaxed">{session.reflection.struggle}</p>
                          </div>
                        )}

                        {session.reflection.workedWell && (
                          <div className="glass-inset p-3">
                            <span className="font-bold text-[#2d523e] block mb-1">
                              💡 Breakthrough / What Worked:
                            </span>
                            <p className="text-[#0f172a] leading-relaxed">{session.reflection.workedWell}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {(session.assignedHomework || session.nextFocusTopic) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-black/10 text-xs">
                        {session.assignedHomework && (
                          <div>
                            <span className="font-bold text-slate-600 block mb-0.5">📝 Assigned Homework:</span>
                            <p className="text-[#0f172a]">{session.assignedHomework}</p>
                          </div>
                        )}
                        {session.nextFocusTopic && (
                          <div>
                            <span className="font-bold text-[#2d523e] block mb-0.5">🎯 Next Session Objective:</span>
                            <p className="text-[#0f172a] font-medium">{session.nextFocusTopic}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {hiddenCount > 0 && (
            <div className="text-center">
              <Link
                href={viewHref(view, true)}
                className="glass-btn glass-btn-sm"
              >
                Show {hiddenCount} older session{hiddenCount !== 1 ? 's' : ''}
              </Link>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}