'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { hrefWith } from '@/lib/pagination';
import Link from 'next/link';
import RevertSessionButton from '@/components/RevertSessionButton';
import DeleteSessionButton from '@/components/DeleteSessionButton';
import { scheduleSessionAction, cancelSessionAction, rescheduleSessionAction } from '@/app/actions/schedule';
import { SessionStatus, SessionType } from '@prisma/client';
import { describeError, isRedirectError } from '@/lib/errors';
import { reopenMessage } from '@/lib/reschedule-chain';

type StudentSummary = {
  id: string;
  name: string;
  courseId: string;
  courseTitle: string;
  subjectCode: string;
  boardCode: string;
  tier: string;
  lastStruggle: string | null;
  lastHomework: string | null;
  lastNextFocus: string | null;
};

type SessionItem = {
  id: string;
  studentId: string;
  studentName: string;
  courseTitle: string;
  boardCode: string;
  sessionDate: string;
  durationMinutes: number;
  sessionType: SessionType;
  status: SessionStatus;
  meetingUrl: string | null;
  assignedHomework: string | null;
  nextFocusTopic: string | null;
  topicsSummary: string;
  fineAmount: number;
  absenceFineIDR: number;
  /** For a rescheduled lesson: the lesson it ended up as. */
  movedTo: { id: string; sessionDate: string } | null;
};

/** YYYY-MM-DD for a day offset from today, as a date input's min/max. */
const dateInputBound = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatMoved = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatIDR = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

/**
 * Cancellation choices. Prior notice and student cancellations never carry a fine; an unexcused
 * absence does, so it is offered only once the lesson time has arrived and asks for confirmation.
 */
function CancelReasons({
  session,
  canMarkAbsent,
  onPick,
  onReschedule,
  compact = false,
}: {
  session: SessionItem;
  canMarkAbsent: boolean;
  onPick: (status: SessionStatus) => void;
  onReschedule: (newDate: string) => void;
  compact?: boolean;
}) {
  const [rescheduling, setRescheduling] = useState(false);
  const toLocalInput = (d: Date) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  // Default to the same slot one week later.
  const [newDate, setNewDate] = useState(() => {
    const d = new Date(session.sessionDate);
    d.setDate(d.getDate() + 7);
    return toLocalInput(d);
  });
  const isPast = !newDate || new Date(newDate) <= new Date();

  const option = compact
    ? 'glass-btn justify-start text-left px-3 py-1.5 text-[11px] font-semibold'
    : 'glass-btn px-3 py-1.5 text-[11px] font-semibold';
  const danger = compact
    ? 'glass-btn glass-btn-danger-solid justify-start text-left px-3 py-1.5 text-[11px] font-bold'
    : 'glass-btn glass-btn-danger-solid px-3 py-1.5 text-[11px] font-bold';

  return (
    <div className={compact ? 'flex flex-col gap-1.5' : 'flex flex-wrap gap-2'}>
      <button type="button" onClick={() => setRescheduling(!rescheduling)} className={option}>
        Rescheduled / Prior Notice (Pasal 7: No fine)
      </button>
      {rescheduling && (
        <div className="basis-full p-3 glass-inset space-y-2">
          <label className="block text-[10px] font-bold text-[#0f172a]">New date & time (WIB)</label>
          <input
            type="datetime-local"
            value={newDate}
            min={toLocalInput(new Date())}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full p-2.5 text-[11px] glass-input"
          />
          {isPast && (
            <p className="text-[10px] font-semibold text-[#a3462f]">
              Pick a time in the future. A lesson that already passed can&apos;t be moved to the past.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPast}
              onClick={() => onReschedule(new Date(newDate).toISOString())}
              className="glass-btn glass-btn-primary glass-btn-sm"
            >
              Reschedule to this time
            </button>
            <button
              type="button"
              onClick={() => onPick('CANCELLED_WITH_NOTICE')}
              className="glass-btn glass-btn-sm"
            >
              Just cancel, pick a time later
            </button>
          </div>
        </div>
      )}
      <button type="button" onClick={() => onPick('CANCELLED_BY_STUDENT')} className={option}>
        Student Cancelled (No fine)
      </button>
      {canMarkAbsent && (
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                `Record an unexcused absence for ${session.studentName}? A fine of ${formatIDR(session.absenceFineIDR)} will be deducted from this month's payroll.`
              )
            ) {
              onPick('ABSENT_UNNOTIFIED');
            }
          }}
          className={danger}
        >
          Tutor Unnotified Absence (Pasal 8: {formatIDR(session.absenceFineIDR)} fine)
        </button>
      )}
    </div>
  );
}

export default function ScheduleClientView({
  students = [],
  sessions = [],
  weekOffset = 0,
  view = 'week',
  totalSessions = 0,
  initialSessionId,
  highlightDate,
  listFooter = null,
}: {
  students?: StudentSummary[];
  sessions?: SessionItem[];
  /** Week shown, relative to this week. Set by the server from ?week=. */
  weekOffset?: number;
  view?: 'week' | 'list';
  totalSessions?: number;
  initialSessionId?: string;
  /** YYYY-MM-DD picked with the date picker; that day is outlined. */
  highlightDate?: string;
  listFooter?: React.ReactNode;
}) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const viewMode: 'CALENDAR' | 'AGENDA' = view === 'list' ? 'AGENDA' : 'CALENDAR';
  const navigate = (changes: Record<string, string | undefined>) =>
    startNavigation(() => router.push(hrefWith('/schedule', {}, changes), { scroll: false }));
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'info' } | null>(null);

  const showToast = (text: string, tone: 'ok' | 'info' = 'ok') => {
    setToast({ text, tone });
    setTimeout(() => setToast(null), 4000);
  };

  const [selectedSessionModal, setSelectedSessionModal] = useState<SessionItem | null>(
    () => sessions.find((s) => s.id === initialSessionId) ?? null
  );

  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [sessionDate, setSessionDate] = useState('2026-09-30T18:30');
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [sessionType, setSessionType] = useState<SessionType>('REGULAR_LESSON');
  const [meetingUrl, setMeetingUrl] = useState('');

  const now = new Date();

  const getSessionState = (s: SessionItem): 'UPCOMING' | 'NEEDS_LOG' | 'COMPLETED' | 'CANCELLED' => {
    if (s.status.startsWith('CANCELLED') || s.status === 'ABSENT_UNNOTIFIED' || s.status === 'RESCHEDULED') {
      return 'CANCELLED';
    }
    if (s.status === 'COMPLETED') {
      return 'COMPLETED';
    }
    const sessionTime = new Date(s.sessionDate);
    if (sessionTime <= now) {
      return 'NEEDS_LOG';
    }
    return 'UPCOMING';
  };

  const activeStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  const handleSlotClick = (dateStr: string, contractSlot: string | null) => {
    let defaultTime = '18:30';
    if (contractSlot === 'Weekend Slot') defaultTime = '10:00';
    
    setSessionDate(`${dateStr}T${defaultTime}`);
    setShowScheduleForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScheduleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeStudent) return;
    setSubmitting(true);

    try {
      await scheduleSessionAction({
        studentId: activeStudent.id,
        courseId: activeStudent.courseId,
        // Send an absolute instant so the server's timezone can't shift the slot.
        sessionDate: new Date(sessionDate).toISOString(),
        durationMinutes,
        sessionType,
        meetingUrl,
        assignedHomework: activeStudent.lastHomework || undefined,
        nextFocusTopic: activeStudent.lastNextFocus || undefined,
      });
      setShowScheduleForm(false);
      showToast(
        `Scheduled ${activeStudent.name} for ${new Date(sessionDate).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`
      );
    } catch (err) {
      if (isRedirectError(err)) throw err;
      console.error('Failed to schedule session:', err);
      alert(describeError('Could not save. Please check the details and try again.', err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (sessionId: string, status: SessionStatus) => {
    try {
      const result = await cancelSessionAction(sessionId, status);
      setCancellingId(null);
      setSelectedSessionModal(null);
      showToast(
        result.fineAmount > 0
          ? `Absence recorded. ${formatIDR(result.fineAmount)} will be deducted from this month's payroll.`
          : 'Session cancelled. No fine applies.',
        'info'
      );
    } catch (err) {
      console.error('Failed to cancel session:', err);
      alert(describeError('Could not update that session. It may no longer be scheduled.', err));
    }
  };

  const handleReschedule = async (sessionId: string, newDate: string) => {
    try {
      await rescheduleSessionAction(sessionId, newDate);
      setCancellingId(null);
      setSelectedSessionModal(null);
      showToast(
        `Rescheduled to ${new Date(newDate).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}. No fine applies.`
      );
    } catch (err) {
      console.error('Failed to reschedule session:', err);
      alert(describeError('Could not reschedule that session.', err));
    }
  };

  // Which way the week list slides in: later weeks from the right, earlier ones from the left.
  const [weekDirection, setWeekDirection] = useState<'next' | 'prev' | 'none'>('none');
  const goToWeek = (target: number) => {
    if (target === weekOffset) return;
    setWeekDirection(target > weekOffset ? 'next' : 'prev');
    navigate({ week: target === 0 ? undefined : String(target) });
  };

  const getDynamicWeek = (offset: number) => {
    const current = new Date();
    const dayOfWeek = (current.getDay() + 6) % 7;
    
    const monday = new Date(current);
    monday.setDate(current.getDate() - dayOfWeek + offset * 7);
    monday.setHours(0, 0, 0, 0);

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return dayNames.map((name, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      let contractSlot: string | null = null;
      if (i === 2 || i === 3 || i === 4) contractSlot = '18:30 WIB Slot';
      if (i === 5) contractSlot = 'Weekend Slot';

      const todayStr = new Date().toISOString().slice(0, 10);
      const isToday = dateStr === todayStr;

      return {
        name,
        dateStr,
        label: d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
        contractSlot,
        isToday,
      };
    });
  };

  const weekDays = getDynamicWeek(weekOffset);
  const weekStartLabel = weekDays[0].label;
  const weekEndLabel = weekDays[6].label;
  const currentYear = new Date(weekDays[0].dateStr).getFullYear();

  return (
    <div className="space-y-6">
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 max-w-sm glass-card-subtle px-4 py-3 text-sm font-semibold ${
            toast.tone === 'ok'
              ? 'text-emerald-900 outline outline-1 outline-emerald-500'
              : 'glass-card-subtle text-[#0f172a]'
          }`}
        >
          {toast.tone === 'ok' ? '✓ ' : ''}
          {toast.text}
        </div>
      )}

      <section className="glass-panel p-6 space-y-5">
        {/* SECTION HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-[#0f172a]">
              {viewMode === 'CALENDAR' ? 'Weekly Timetable' : 'All Sessions'}
            </h2>
            <span className="glass-pill text-xs font-bold px-2.5 py-0.5">
              {totalSessions} Session{totalSessions !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => navigate({ view: viewMode === 'CALENDAR' ? 'list' : undefined })}
              className="glass-btn"
            >
              {viewMode === 'CALENDAR' ? '📋 List View' : '📅 Week View'}
            </button>
            <button
              type="button"
              onClick={() => setShowScheduleForm(!showScheduleForm)}
              className="glass-btn glass-btn-primary"
            >
              {showScheduleForm ? '✕ Close Form' : '+ Book Session'}
            </button>
          </div>
        </div>

      {/* SCHEDULE FORM MODAL */}
      {showScheduleForm && (
        <form onSubmit={handleScheduleSubmit} className="glass-card-subtle outline outline-2 outline-[#3d6b52]/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#2d523e]">
              Book Teaching Slot
            </h2>
            <span className="text-[11px] text-slate-600">
              Auto-prefilled for {new Date(sessionDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-[#0f172a] mb-1">Student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full p-2.5 font-medium glass-input"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.courseTitle} ({s.tier})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#0f172a] mb-1">Session Type</label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value as SessionType)}
                className="w-full p-2.5 font-medium glass-input"
              >
                <option value="REGULAR_LESSON">Regular Lesson (Standard Flow)</option>
                <option value="TRIAL_CLASS">Trial Class (New Prospect)</option>
                <option value="EXAM_SIMULATION">Past Paper Mock Simulation</option>
                <option value="REVISION_RECALL">Revision & Interleaving</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#0f172a] mb-1">Date & Time (WIB)</label>
              <input
                type="datetime-local"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full p-2.5 glass-input"
              />
              <span className="text-[10px] text-slate-600 mt-0.5 block">Standard window: 18:30 WIB</span>
            </div>

            <div>
              <label className="block font-bold text-[#0f172a] mb-1">Duration (Minutes)</label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full p-2.5 glass-input"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-[#0f172a] mb-1">Meeting Link (Zoom / Google Meet)</label>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/... or https://zoom.us/..."
                className="w-full p-2.5 glass-input"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowScheduleForm(false)}
              className="glass-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="glass-btn glass-btn-primary"
            >
              {submitting ? 'Booking...' : 'Confirm Schedule'}
            </button>
          </div>
        </form>
      )}

      {/* VIEW 1: WEEKLY TIMETABLE */}
      {viewMode === 'CALENDAR' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => goToWeek(weekOffset - 1)}
                className="glass-btn glass-btn-sm"
                title="Previous Week"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => goToWeek(0)}
                className={`glass-btn glass-btn-sm ${weekOffset === 0 ? 'glass-btn-primary' : ''}`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => goToWeek(weekOffset + 1)}
                className="glass-btn glass-btn-sm"
                title="Next Week"
              >
                →
              </button>
              <span className="text-sm font-bold text-[#0f172a] ml-1">
                {weekStartLabel} – {weekEndLabel}, {currentYear}
              </span>
              <input
                type="date"
                aria-label="Jump to a date"
                title="Jump to a date"
                className="glass-input px-3 py-1.5 text-xs font-semibold"
                value={highlightDate ?? weekDays[0].dateStr}
                min={dateInputBound(-3650)}
                max={dateInputBound(3650)}
                onChange={(e) => {
                  const [y, m, d] = e.target.value.split('-').map(Number);
                  if (!y || !m || !d) return;
                  const picked = new Date(y, m - 1, d);
                  setWeekDirection(picked > new Date(weekDays[0].dateStr) ? 'next' : 'prev');
                  navigate({ date: e.target.value, week: undefined });
                }}
              />
            </div>

            <div className="flex items-center gap-3 text-xs font-medium text-slate-700">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Upcoming</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> Needs log</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Logged</span>
            </div>
          </div>

          <div
            key={weekOffset}
            className={`divide-y divide-black/5 transition-opacity ${isNavigating ? 'opacity-60' : ''} ${
              weekDirection === 'next' ? 'week-slide-next' : weekDirection === 'prev' ? 'week-slide-prev' : ''
            }`}
          >
            {weekDays.map((day) => {
              const daySessions = sessions.filter((s) => s.sessionDate.startsWith(day.dateStr));

              return (
                <div
                  key={day.dateStr}
                  className={`py-4 first:pt-0 last:pb-0 grid grid-cols-1 sm:grid-cols-[132px_1fr] gap-3 ${
                    highlightDate === day.dateStr ? 'rounded-2xl outline outline-2 outline-[#2d523e]/60 outline-offset-4' : ''
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-[#0f172a]">{day.name}</span>
                      {day.isToday && (
                        <span className="glass-badge bg-emerald-50 text-emerald-700 border-emerald-200">Today</span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-slate-700">{day.label}</div>
                    {day.contractSlot && (
                      <div className="text-[11px] font-bold text-[#2d523e] mt-0.5">{day.contractSlot}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {daySessions.map((s) => {
                      const state = getSessionState(s);
                      const sTime = new Date(s.sessionDate).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      });

                      const stateConfig = {
                        UPCOMING: { badge: 'bg-blue-50 text-blue-700 border-blue-200', text: 'Upcoming' },
                        NEEDS_LOG: { badge: 'bg-red-50 text-red-700 border-red-300', text: '⚠️ Needs log' },
                        COMPLETED: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: '✓ Done' },
                        CANCELLED: {
                          badge: 'bg-gray-100 text-gray-600 border-gray-300',
                          text: s.status === 'RESCHEDULED' ? 'Rescheduled' : s.status === 'ABSENT_UNNOTIFIED' ? 'Absent' : 'Cancelled',
                        },
                      }[state];

                      return (
                        <div
                          key={s.id}
                          onClick={() => setSelectedSessionModal(s)}
                          className="glass-card-subtle p-4 flex items-center justify-between gap-3 transition-all hover:brightness-105 group glass-interactive"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="text-sm font-bold text-[#0f172a] tabular-nums whitespace-nowrap shrink-0">{sTime}</div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-[#0f172a] group-hover:underline truncate">{s.studentName}</div>
                              <div className="text-xs text-slate-700 truncate">{s.courseTitle}</div>
                            </div>
                          </div>
                          <span className={`glass-badge ${stateConfig.badge}`}>{stateConfig.text}</span>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => handleSlotClick(day.dateStr, day.contractSlot)}
                      className="glass-inset w-full p-3 text-xs font-semibold text-slate-700 hover:text-[#2d523e] transition-all glass-interactive"
                    >
                      {daySessions.length === 0
                        ? `+ Book ${day.contractSlot ? '18:30 slot' : 'a slot'}`
                        : '+ Add another session'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: AGENDA / ALL SESSIONS LIST */}
      {viewMode === 'AGENDA' && (
        <div className="divide-y divide-black/5">
          {sessions.length === 0 ? (
            <div className="glass-inset p-8 text-center text-xs text-slate-700">
              No sessions scheduled yet.
            </div>
          ) : (
            sessions.map((s) => {
              const state = getSessionState(s);
              const sDate = new Date(s.sessionDate);

              const stateBadge = {
                UPCOMING: { label: '🔵 Upcoming', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                NEEDS_LOG: { label: '🔴 Overdue (Needs Log!)', color: 'bg-red-50 text-red-700 border-red-300 font-bold' },
                COMPLETED: { label: '🟢 Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                CANCELLED: { label: '⚪ Cancelled', color: 'bg-gray-100 text-gray-500 border-gray-300' },
              }[state];

              return (
                <article
                  key={s.id}
                  onClick={() => setSelectedSessionModal(s)}
                  className="py-4 first:pt-0 last:pb-0 space-y-3 cursor-pointer transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-black/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`glass-badge ${stateBadge.color}`}>
                          {s.status === 'RESCHEDULED'
                            ? s.movedTo
                              ? `🔁 Rescheduled to ${formatMoved(s.movedTo.sessionDate)}`
                              : '🔁 Rescheduled'
                            : stateBadge.label}
                        </span>
                        <span className="text-xs font-bold text-[#0f172a]">
                          {sDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ·{' '}
                          {sDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} WIB
                        </span>
                        <span className="text-[11px] px-2 py-0.5 text-slate-600 glass-chip">
                          {s.durationMinutes} mins
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#0f172a]">{s.studentName}</h3>
                      <p className="text-xs text-slate-600">{s.courseTitle} · {s.boardCode}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                      {/* FIXED: Pass sessionId so scheduled row is updated, not duplicated! */}
                      {state === 'NEEDS_LOG' && (
                        <Link
                          href={`/sessions/new?studentId=${s.studentId}&sessionId=${s.id}`}
                          className="glass-btn glass-btn-danger-solid"
                        >
                          Log Lesson Now →
                        </Link>
                      )}

                      {state === 'UPCOMING' && s.meetingUrl && (
                        <a
                          href={s.meetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="glass-btn inline-flex items-center"
                        >
                          Join Call ↗
                        </a>
                      )}

                      {state === 'COMPLETED' && (
                        <Link
                          href={`/students/${s.studentId}`}
                          className="glass-btn"
                        >
                          View in Dossier →
                        </Link>
                      )}

                      {state === 'CANCELLED' && (
                        <RevertSessionButton
                          sessionId={s.id}
                          label="Reopen"
                          message={reopenMessage({
                            fineAmount: s.fineAmount,
                            movedToLabel: s.movedTo ? formatMoved(s.movedTo.sessionDate) : null,
                          })}
                          className="glass-btn glass-btn-sm"
                          onReverted={() => showToast('Lesson put back on the schedule', 'info')}
                        />
                      )}

                      {(state === 'UPCOMING' || state === 'NEEDS_LOG') && (
                        <button
                          type="button"
                          onClick={() => setCancellingId(cancellingId === s.id ? null : s.id)}
                          className="glass-btn glass-btn-danger glass-btn-sm"
                        >
                          Cancel / Reschedule ▾
                        </button>
                      )}

                      <DeleteSessionButton
                        sessionId={s.id}
                        completed={state === 'COMPLETED'}
                        onDeleted={() => showToast('Session deleted', 'info')}
                      />
                    </div>
                  </div>

                  {cancellingId === s.id && (
                    <div className="glass-inset p-3 space-y-2 text-xs" onClick={(e) => e.stopPropagation()}>
                      <span className="font-bold text-[#a3462f] block">Select Cancellation Reason:</span>
                      <CancelReasons
                        session={s}
                        canMarkAbsent={state === 'NEEDS_LOG'}
                        onPick={(status) => handleCancel(s.id, status)}
                        onReschedule={(date) => handleReschedule(s.id, date)}
                      />
                    </div>
                  )}

                  {(s.nextFocusTopic || s.assignedHomework || s.topicsSummary) && (
                    <div className="p-3 text-xs space-y-1 glass-inset">
                      {s.topicsSummary && (
                        <p className="text-[#0f172a]">
                          <strong>Topics Covered:</strong> {s.topicsSummary}
                        </p>
                      )}
                      {s.nextFocusTopic && (
                        <p className="text-[#0f172a]">
                          <strong className="text-[#2d523e]">🎯 Target:</strong> {s.nextFocusTopic}
                        </p>
                      )}
                      {s.assignedHomework && (
                        <p className="text-slate-600">
                          <strong>📝 Homework:</strong> {s.assignedHomework}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}

      {viewMode === 'AGENDA' && listFooter}
      </section>

      {/* RATIONAL INSPECTOR MODAL */}
      {selectedSessionModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          onClick={() => setSelectedSessionModal(null)}
        >
          <div
            className="glass-panel max-w-md w-full p-6 space-y-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-black/10 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-white bg-[#3d6b52] px-2.5 py-0.5 rounded-full">
                    {new Date(selectedSessionModal.sessionDate).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}{' '}
                    WIB
                  </span>
                  <span className="text-xs text-slate-600">
                    {selectedSessionModal.durationMinutes} mins
                  </span>
                  {getSessionState(selectedSessionModal) === 'UPCOMING' && (
                    <span className="glass-badge text-blue-700 bg-blue-50 border-blue-200">
                      🔵 Upcoming
                    </span>
                  )}
                  {getSessionState(selectedSessionModal) === 'NEEDS_LOG' && (
                    <span className="glass-badge text-red-700 bg-red-50 border-red-300 animate-pulse">
                      🔴 Needs Log
                    </span>
                  )}
                  {getSessionState(selectedSessionModal) === 'COMPLETED' && (
                    <span className="glass-badge text-emerald-700 bg-emerald-50 border-emerald-200">
                      🟢 Completed
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-[#0f172a]">
                  {selectedSessionModal.studentName}
                </h3>
                <p className="text-xs text-slate-600">
                  {selectedSessionModal.courseTitle} · {selectedSessionModal.boardCode}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSessionModal(null)}
                className="text-slate-600 hover:text-[#0f172a] glass-btn glass-btn-icon"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            {getSessionState(selectedSessionModal) === 'COMPLETED' ? (
              <div className="space-y-3 text-xs">
                <span className="font-bold uppercase tracking-wider text-[#2d523e] text-[10px] block">
                  Completed Session Ledger
                </span>
                {selectedSessionModal.topicsSummary && (
                  <div className="p-3 glass-inset">
                    <strong className="text-[#0f172a] block mb-0.5">Topics Mastered & Practiced:</strong>
                    <p className="text-slate-600 leading-relaxed">{selectedSessionModal.topicsSummary}</p>
                  </div>
                )}
                {selectedSessionModal.assignedHomework && (
                  <div className="p-3 glass-inset">
                    <strong className="text-[#2d523e] block mb-0.5">Assigned Homework:</strong>
                    <p className="text-[#0f172a]">{selectedSessionModal.assignedHomework}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <span className="font-bold uppercase tracking-wider text-slate-600 text-[10px] block">
                  Pre-Session Briefing
                </span>

                {selectedSessionModal.nextFocusTopic ? (
                  <div className="p-3 glass-inset text-[#0f172a]">
                    <strong className="text-[#2d523e] block mb-0.5">🎯 Planned Target:</strong>
                    {selectedSessionModal.nextFocusTopic}
                  </div>
                ) : (
                  <div className="p-3 text-slate-600 italic glass-inset">
                    Standard lesson progression.
                  </div>
                )}

                {selectedSessionModal.assignedHomework && (
                  <div className="p-3 text-[#0f172a] glass-inset">
                    <strong className="text-slate-600 block mb-0.5">📝 Homework to Audit:</strong>
                    {selectedSessionModal.assignedHomework}
                  </div>
                )}
              </div>
            )}

            {/* Meeting Link Launcher */}
            {selectedSessionModal.meetingUrl && getSessionState(selectedSessionModal) !== 'COMPLETED' && (
              <div className="pt-1">
                <a
                  href={selectedSessionModal.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="glass-btn w-full flex items-center justify-center"
                >
                  <span>Launch Google Meet / Zoom</span> ↗
                </a>
              </div>
            )}

            {/* RATIONAL MODAL FOOTER */}
            <div className="pt-3 border-t border-black/10 flex items-center justify-between gap-2">
              <Link
                href={`/students/${selectedSessionModal.studentId}`}
                className="text-xs text-[#2d523e] hover:underline font-semibold"
              >
                View Student Dossier →
              </Link>

              <div className="flex flex-wrap items-center gap-2">
                {/* State 1: UPCOMING (Future) */}
                {getSessionState(selectedSessionModal) === 'UPCOMING' && (
                  <span className="text-[11px] text-slate-600 italic">
                    Opens at {new Date(selectedSessionModal.sessionDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} WIB
                  </span>
                )}

                {/* State 2: NEEDS_LOG (Overdue/Present) -> Passes sessionId to update existing row! */}
                {getSessionState(selectedSessionModal) === 'NEEDS_LOG' && (
                  <Link
                    href={`/sessions/new?studentId=${selectedSessionModal.studentId}&sessionId=${selectedSessionModal.id}`}
                    className="glass-btn glass-btn-danger-solid"
                  >
                    Log Lesson Now →
                  </Link>
                )}

                {/* State 3: COMPLETED (Done) -> Clean Close button */}
                {getSessionState(selectedSessionModal) === 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => setSelectedSessionModal(null)}
                    className="glass-btn glass-btn-sm"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>

            {/* Cancel section: before the lesson, and after it when it was never logged */}
            {(getSessionState(selectedSessionModal) === 'UPCOMING' ||
              getSessionState(selectedSessionModal) === 'NEEDS_LOG') && (
              <div className="pt-2 border-t border-black/10">
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setCancellingId(
                        cancellingId === selectedSessionModal.id ? null : selectedSessionModal.id
                      )
                    }
                    className="glass-btn glass-btn-sm glass-btn-danger"
                  >
                    Cancel or Reschedule this Class
                  </button>
                </div>

                {cancellingId === selectedSessionModal.id && (
                  <div className="mt-2 glass-inset p-3 space-y-1.5 text-left text-xs">
                    <span className="font-bold text-[#a3462f] text-[10px] block">Select Reason:</span>
                    <CancelReasons
                      compact
                      session={selectedSessionModal}
                      canMarkAbsent={getSessionState(selectedSessionModal) === 'NEEDS_LOG'}
                      onPick={(status) => handleCancel(selectedSessionModal.id, status)}
                      onReschedule={(date) => handleReschedule(selectedSessionModal.id, date)}
                    />
                  </div>
                )}
              </div>
            )}

            {getSessionState(selectedSessionModal) === 'CANCELLED' && (
              <div className="pt-2 border-t border-black/10 space-y-1 text-center">
                {selectedSessionModal.status === 'RESCHEDULED' && (
                  <p className="text-[11px] text-[#2d523e] font-semibold">
                    {selectedSessionModal.movedTo ? (
                      <>
                        Rescheduled to{' '}
                        <button
                          type="button"
                          className="underline"
                          onClick={() => {
                            const targetId = selectedSessionModal.movedTo?.id;
                            if (targetId) {
                              setSelectedSessionModal(null);
                              router.push(`/schedule?session=${targetId}`);
                            }
                          }}
                        >
                          {formatMoved(selectedSessionModal.movedTo.sessionDate)}
                        </button>
                      </>
                    ) : (
                      'Rescheduled. The new lesson no longer exists.'
                    )}
                  </p>
                )}
                {selectedSessionModal.fineAmount > 0 && (
                  <p className="text-[11px] text-[#a3462f] font-semibold">
                    Unexcused absence: {formatIDR(selectedSessionModal.fineAmount)} fine applied to payroll.
                  </p>
                )}
                <div className="flex justify-center">
<RevertSessionButton
                  sessionId={selectedSessionModal.id}
                  label="Reopen this lesson"
                  message={reopenMessage({
                    fineAmount: selectedSessionModal.fineAmount,
                    movedToLabel: selectedSessionModal.movedTo
                      ? formatMoved(selectedSessionModal.movedTo.sessionDate)
                      : null,
                  })}
                  onReverted={() => {
                    setSelectedSessionModal(null);
                    showToast('Lesson put back on the schedule', 'info');
                  }}
                />
</div>
              </div>
            )}

            {getSessionState(selectedSessionModal) === 'COMPLETED' && (
              <div className="pt-2 border-t border-black/10">
                <div className="flex justify-center">
<RevertSessionButton
                  sessionId={selectedSessionModal.id}
                  label="Revert to scheduled"
                  onReverted={() => {
                    setSelectedSessionModal(null);
                    showToast('Lesson reverted to scheduled', 'info');
                  }}
                />
</div>
              </div>
            )}

            <div className="pt-2 border-t border-black/10">
              <div className="flex justify-center">
<DeleteSessionButton
                sessionId={selectedSessionModal.id}
                completed={getSessionState(selectedSessionModal) === 'COMPLETED'}
                label="Delete this session"
                onDeleted={() => {
                  setSelectedSessionModal(null);
                  showToast('Session deleted', 'info');
                }}
              />
</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}