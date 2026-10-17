'use client';

import { useDialog } from '@/components/DialogProvider';
import LiquidText from '@/components/LiquidText';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { countdownLabel, reminderMessage } from '@/lib/lesson-briefing';
import { useTimeZone } from '@/components/TimeZoneProvider';

export type BriefingLesson = {
  sessionId: string;
  status: string;
  studentId: string;
  studentName: string;
  courseTitle: string;
  startIso: string;
  durationMinutes: number;
  meetingUrl: string | null;
};

export type BriefingSuggestion = { code: string; title: string; reason: string; kind: string };

export type BriefingNotes = {
  struggle: string | null;
  homework: string | null;
  nextFocus: string | null;
};

const KIND_LABEL: Record<string, string> = {
  struggling: 'Fix',
  practice: 'Firm up',
  new: 'Introduce',
  recall: 'Recall',
};

const PHASE_STYLE = {
  upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
  now: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  running: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  over: 'bg-red-50 text-red-700 border-red-200',
} as const;

export default function NextLessonBriefing({
  mode,
  lesson,
  notes,
  suggestions,
}: {
  /** "next": a lesson still to teach. "latest": nothing scheduled, so the last logged lesson. */
  mode: 'next' | 'latest' | 'empty';
  lesson: BriefingLesson | null;
  notes: BriefingNotes | null;
  suggestions: BriefingSuggestion[];
}) {
  const zone = useTimeZone();
  const dialog = useDialog();
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (mode === 'empty' || !lesson) {
    return (
      <section className="glass-panel p-6 space-y-3">
        <h2 className="text-base font-bold text-[#0f172a]">⚡ Next Lesson</h2>
        <div className="glass-inset p-4 text-xs text-slate-700 text-center">
          No upcoming or recent lessons. Book one from the Schedule.
        </div>
        <Link href="/schedule" className="glass-btn glass-btn-primary w-full">
          Open Schedule
        </Link>
      </section>
    );
  }

  const start = new Date(lesson.startIso);
  const countdown = mode === 'next' ? countdownLabel(start.getTime(), lesson.durationMinutes, now) : null;
  const dateLine = `${zone.format(start, { weekday: 'short', month: 'short', day: 'numeric' })} at ${zone.format(start, { hour: '2-digit', minute: '2-digit', hour12: false }, 'en-GB')} ${zone.label}`;
  const canLog = mode === 'next' && lesson.status === 'SCHEDULED' && start.getTime() <= now;

  const copyReminder = async () => {
    try {
      await navigator.clipboard.writeText(
        reminderMessage({
          studentName: lesson.studentName,
          courseTitle: lesson.courseTitle,
          startIso: lesson.startIso,
          durationMinutes: lesson.durationMinutes,
          meetingUrl: lesson.meetingUrl,
          timeZone: zone.tz,
        })
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      void dialog.notify({ message: 'Could not copy. Your browser blocked clipboard access.' });
    }
  };

  return (
    <section className="glass-panel p-6 space-y-4">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-[#0f172a]">⚡ {mode === 'next' ? 'Next Lesson' : 'Latest Lesson'}</h2>
          {countdown ? (
            <span className={`glass-badge ${PHASE_STYLE[countdown.phase]}`} suppressHydrationWarning>
              <LiquidText text={countdown.text} />
            </span>
          ) : (
            <span className="glass-chip px-2 py-0.5 text-[11px] font-semibold">Last class</span>
          )}
        </div>
        <p className="text-sm font-bold text-[#0f172a] mt-1.5">{lesson.studentName}</p>
        <p className="text-xs font-medium text-slate-700">
          {lesson.courseTitle} · {dateLine}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {mode === 'next' && lesson.meetingUrl && (
          <a
            href={lesson.meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="glass-btn glass-btn-primary col-span-2"
          >
            Launch Meeting ↗
          </a>
        )}
        {canLog && (
          <Link
            href={`/sessions/new?studentId=${lesson.studentId}&sessionId=${lesson.sessionId}`}
            className="glass-btn glass-btn-danger-solid col-span-2"
          >
            Log Lesson Now →
          </Link>
        )}
        <Link href={`/students/${lesson.studentId}`} className="glass-btn glass-btn-sm">
          Dossier
        </Link>
        {mode === 'next' ? (
          <button type="button" onClick={copyReminder} className="glass-btn glass-btn-sm">
            <LiquidText text={copied ? '✓ Copied' : 'Copy reminder'} />
          </button>
        ) : (
          <Link href="/schedule" className="glass-btn glass-btn-sm">
            Schedule
          </Link>
        )}
      </div>

      {notes && (notes.struggle || notes.homework || notes.nextFocus) ? (
        <div className="space-y-3 text-xs">
          {notes.struggle && (
            <div className="p-4 glass-card-subtle accent-rose">
              <span className="font-bold text-rose-700 block mb-0.5">⚠️ Struggle to revisit (2m warm-up)</span>
              <p className="text-[#0f172a] leading-relaxed font-medium">{notes.struggle}</p>
            </div>
          )}
          {notes.homework && (
            <div className="p-4 glass-card-subtle accent-ink">
              <span className="font-bold text-[#0f172a] block mb-0.5">📝 Homework to audit</span>
              <p className="text-slate-700 leading-relaxed font-medium">{notes.homework}</p>
            </div>
          )}
          {notes.nextFocus && (
            <div className="p-4 glass-card-subtle">
              <span className="font-bold text-[#0f172a] block mb-0.5">🎯 Planned target</span>
              <p className="text-[#0f172a] font-bold">{notes.nextFocus}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-inset p-4 text-xs text-slate-700 text-center">No continuity notes recorded yet.</div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0f172a]">Suggested focus</h3>
          <ul className="space-y-1.5">
            {suggestions.map((s) => (
              <li key={s.code} className="glass-inset p-3 text-xs">
                <div className="flex items-start gap-2">
                  <span className="glass-chip px-2 py-0.5 text-[10px] font-bold uppercase text-[#2d523e] shrink-0">
                    {KIND_LABEL[s.kind] ?? s.kind}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-[#0f172a]">
                      {s.code} {s.title}
                    </div>
                    <div className="text-[11px] text-slate-700">{s.reason}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
