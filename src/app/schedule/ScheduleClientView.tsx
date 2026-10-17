'use client';

import { useState } from 'react';
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
    ? 'text-left bg-white border border-[#ddd8cd] hover:bg-gray-50 px-2.5 py-1.5 rounded text-[11px] font-semibold text-[#2b2b28]'
    : 'bg-white border border-[#ddd8cd] hover:bg-gray-50 px-3 py-1.5 rounded text-[11px] font-semibold text-[#2b2b28]';
  const danger = compact
    ? 'text-left bg-[#a3462f] text-white px-2.5 py-1.5 rounded text-[11px] font-bold hover:bg-[#853623]'
    : 'bg-[#a3462f] text-white px-3 py-1.5 rounded text-[11px] font-bold hover:bg-[#853623]';

  return (
    <div className={compact ? 'flex flex-col gap-1.5' : 'flex flex-wrap gap-2'}>
      <button type="button" onClick={() => setRescheduling(!rescheduling)} className={option}>
        Rescheduled / Prior Notice (Pasal 7: No fine)
      </button>
      {rescheduling && (
        <div className="basis-full p-2.5 bg-white border border-[#3d6b52]/30 rounded-lg space-y-2">
          <label className="block text-[10px] font-bold text-[#2b2b28]">New date & time (WIB)</label>
          <input
            type="datetime-local"
            value={newDate}
            min={toLocalInput(new Date())}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full bg-white/60 border border-[#ddd8cd] rounded p-1.5 text-[11px] focus:outline-none focus:border-[#3d6b52]"
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
              className="bg-[#3d6b52] text-white px-3 py-1.5 rounded text-[11px] font-bold hover:bg-[#2d523e] disabled:opacity-50"
            >
              Reschedule to this time
            </button>
            <button
              type="button"
              onClick={() => onPick('CANCELLED_WITH_NOTICE')}
              className="px-3 py-1.5 rounded border border-[#ddd8cd] text-[11px] font-semibold text-[#6f6b62] hover:bg-gray-50"
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
  initialWeekOffset = 0,
  initialSessionId,
}: {
  students?: StudentSummary[];
  sessions?: SessionItem[];
  initialWeekOffset?: number;
  initialSessionId?: string;
}) {
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'AGENDA'>('CALENDAR');
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

  const [weekOffset, setWeekOffset] = useState(initialWeekOffset);

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
          className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${
            toast.tone === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-white border-[#ddd8cd] text-[#2b2b28]'
          }`}
        >
          {toast.tone === 'ok' ? '✓ ' : ''}
          {toast.text}
        </div>
      )}

      {/* TIMETABLE CONTROLS */}
      <div className="glass-panel rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('CALENDAR')}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${
              viewMode === 'CALENDAR'
                ? 'bg-[#3d6b52] text-white'
                : 'bg-white/60 text-[#6f6b62] border border-[#ddd8cd] hover:bg-[#e8efe9]'
            }`}
          >
            📅 Weekly Calendar
          </button>
          <button
            type="button"
            onClick={() => setViewMode('AGENDA')}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${
              viewMode === 'AGENDA'
                ? 'bg-[#3d6b52] text-white'
                : 'bg-white/60 text-[#6f6b62] border border-[#ddd8cd] hover:bg-[#e8efe9]'
            }`}
          >
            📋 All Sessions List ({sessions.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowScheduleForm(!showScheduleForm)}
          className="bg-[#3d6b52] hover:bg-[#2d523e] text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm self-start sm:self-auto"
        >
          {showScheduleForm ? '✕ Close Form' : '+ Book / Schedule Session'}
        </button>
      </div>

      {/* SCHEDULE FORM MODAL */}
      {showScheduleForm && (
        <form onSubmit={handleScheduleSubmit} className="glass-panel ring-2 ring-[#3d6b52]/30 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#3d6b52]">
              Book Teaching Slot
            </h2>
            <span className="text-[11px] text-[#6f6b62]">
              Auto-prefilled for {new Date(sessionDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-[#2b2b28] mb-1">Student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-white/60 border border-[#ddd8cd] rounded-lg p-2.5 font-medium focus:outline-none focus:border-[#3d6b52]"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.courseTitle} ({s.tier})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#2b2b28] mb-1">Session Type</label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value as SessionType)}
                className="w-full bg-white/60 border border-[#ddd8cd] rounded-lg p-2.5 font-medium focus:outline-none focus:border-[#3d6b52]"
              >
                <option value="REGULAR_LESSON">Regular Lesson (Standard Flow)</option>
                <option value="TRIAL_CLASS">Trial Class (New Prospect)</option>
                <option value="EXAM_SIMULATION">Past Paper Mock Simulation</option>
                <option value="REVISION_RECALL">Revision & Interleaving</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#2b2b28] mb-1">Date & Time (WIB)</label>
              <input
                type="datetime-local"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full bg-white/60 border border-[#ddd8cd] rounded-lg p-2.5 focus:outline-none focus:border-[#3d6b52]"
              />
              <span className="text-[10px] text-[#6f6b62] mt-0.5 block">Standard window: 18:30 WIB</span>
            </div>

            <div>
              <label className="block font-bold text-[#2b2b28] mb-1">Duration (Minutes)</label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-white/60 border border-[#ddd8cd] rounded-lg p-2.5 focus:outline-none focus:border-[#3d6b52]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-[#2b2b28] mb-1">Meeting Link (Zoom / Google Meet)</label>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/... or https://zoom.us/..."
                className="w-full bg-white/60 border border-[#ddd8cd] rounded-lg p-2.5 focus:outline-none focus:border-[#3d6b52]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowScheduleForm(false)}
              className="px-4 py-2 border border-[#ddd8cd] rounded-lg text-xs font-bold text-[#6f6b62]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#3d6b52] text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-[#2d523e] transition-colors disabled:opacity-50"
            >
              {submitting ? 'Booking...' : 'Confirm Schedule'}
            </button>
          </div>
        </form>
      )}

      {/* VIEW 1: WEEKLY CALENDAR GRID */}
      {viewMode === 'CALENDAR' && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-[#6f6b62] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWeekOffset(weekOffset - 1)}
                className="px-2.5 py-1 bg-white/70 border border-[#ddd8cd] rounded hover:bg-white text-xs font-bold"
                title="Previous Week"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors ${
                  weekOffset === 0
                    ? 'bg-[#3d6b52] text-white border-[#3d6b52]'
                    : 'bg-white border-[#ddd8cd] hover:bg-white/80 text-[#2b2b28]'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(weekOffset + 1)}
                className="px-2.5 py-1 bg-white/70 border border-[#ddd8cd] rounded hover:bg-white text-xs font-bold"
                title="Next Week"
              >
                →
              </button>
              <span className="font-bold text-[#2b2b28] ml-1">
                {weekStartLabel} – {weekEndLabel}, {currentYear}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Upcoming</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Needs Log</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Logged</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const daySessions = sessions.filter((s) => s.sessionDate.startsWith(day.dateStr));

              return (
                <div
                  key={day.dateStr}
                  className={`glass-card-subtle rounded-xl p-3 flex flex-col justify-between min-h-[175px] transition-all ${
                    day.isToday
                      ? 'ring-2 ring-[#3d6b52]'
                      : day.contractSlot
                        ? 'ring-1 ring-[#3d6b52]/40'
                        : ''
                  }`}
                >
                  <div className="border-b border-[#ddd8cd]/40 pb-1.5 mb-2 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-[#2b2b28]">{day.name}</span>
                        <span className="text-[11px] text-[#6f6b62]">{day.label}</span>
                      </div>
                      {day.contractSlot && (
                        <span className="text-[9px] font-bold text-[#3d6b52] uppercase block tracking-tighter mt-0.5">
                          {day.contractSlot}
                        </span>
                      )}
                    </div>

                    {daySessions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSlotClick(day.dateStr, day.contractSlot)}
                        className="w-5 h-5 rounded-full bg-white/60 hover:bg-[#e8efe9] border border-[#ddd8cd] text-[#3d6b52] font-bold text-xs flex items-center justify-center transition-colors"
                        title="Book another session on this day"
                      >
                        +
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1 flex flex-col justify-center">
                    {daySessions.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => handleSlotClick(day.dateStr, day.contractSlot)}
                        className="h-full w-full flex flex-col items-center justify-center text-[10px] text-[#6f6b62] hover:text-[#3d6b52] hover:bg-[#e8efe9]/60 rounded-lg py-5 border border-dashed border-[#ddd8cd] hover:border-[#3d6b52]/50 transition-all cursor-pointer group"
                      >
                        <span className="text-sm font-bold text-[#3d6b52] group-hover:scale-125 transition-transform">+</span>
                        <span className="font-semibold mt-0.5">
                          {day.contractSlot ? 'Book 18:30' : 'Book Slot'}
                        </span>
                      </button>
                    ) : (
                      daySessions.map((s) => {
                        const state = getSessionState(s);
                        const sTime = new Date(s.sessionDate).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        });

                        const stateConfig = {
                          UPCOMING: { badge: 'bg-blue-50 text-blue-700 border-blue-200', text: 'Upcoming' },
                          NEEDS_LOG: { badge: 'bg-red-50 text-red-700 border-red-300 font-bold animate-pulse', text: '⚠️ Needs Log' },
                          COMPLETED: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: '✓ Done' },
                          CANCELLED: { badge: 'bg-gray-100 text-gray-500 border-gray-300 line-through', text: 'Cancelled' },
                        }[state];

                        return (
                          <div
                            key={s.id}
                            onClick={() => setSelectedSessionModal(s)}
                            className="p-2.5 glass-card-subtle rounded-lg shadow-2xs space-y-1 text-left cursor-pointer transition-all hover:shadow-md group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-[#2b2b28]">{sTime}</span>
                              <span className={`text-[9px] px-1 py-0.2 rounded border ${stateConfig.badge}`}>
                                {stateConfig.text}
                              </span>
                            </div>
                            <div className="text-[11px] font-bold text-[#3d6b52] group-hover:underline truncate">
                              {s.studentName}
                            </div>
                            <p className="text-[9px] text-[#6f6b62] truncate">
                              {s.courseTitle}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: AGENDA / ALL SESSIONS LIST */}
      {viewMode === 'AGENDA' && (
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="glass-panel rounded-2xl p-10 text-center text-xs text-[#6f6b62]">
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
                  className="glass-panel rounded-2xl p-5 shadow-sm space-y-4 cursor-pointer transition-all hover:shadow-md"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#ddd8cd]/50 pb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2.5 py-0.5 rounded border ${stateBadge.color}`}>
                          {s.status === 'RESCHEDULED'
                            ? s.movedTo
                              ? `🔁 Rescheduled to ${formatMoved(s.movedTo.sessionDate)}`
                              : '🔁 Rescheduled'
                            : stateBadge.label}
                        </span>
                        <span className="text-xs font-bold text-[#2b2b28]">
                          {sDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ·{' '}
                          {sDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} WIB
                        </span>
                        <span className="text-[11px] bg-white/60 border border-[#ddd8cd] px-2 py-0.5 rounded text-[#6f6b62]">
                          {s.durationMinutes} mins
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#2b2b28]">{s.studentName}</h3>
                      <p className="text-xs text-[#6f6b62]">{s.courseTitle} · {s.boardCode}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                      {/* FIXED: Pass sessionId so scheduled row is updated, not duplicated! */}
                      {state === 'NEEDS_LOG' && (
                        <Link
                          href={`/sessions/new?studentId=${s.studentId}&sessionId=${s.id}`}
                          className="bg-[#a3462f] hover:bg-[#853623] text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
                        >
                          Log Lesson Now →
                        </Link>
                      )}

                      {state === 'UPCOMING' && s.meetingUrl && (
                        <a
                          href={s.meetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-[#e8efe9] hover:bg-[#d8e5da] text-[#3d6b52] border border-[#3d6b52]/20 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                        >
                          Join Call ↗
                        </a>
                      )}

                      {state === 'COMPLETED' && (
                        <Link
                          href={`/students/${s.studentId}`}
                          className="bg-white/60 hover:bg-[#e8efe9] text-[#3d6b52] border border-[#ddd8cd] px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors"
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
                          className="text-xs text-[#3d6b52] border border-[#3d6b52]/30 hover:bg-[#e8efe9] px-3 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                          onReverted={() => showToast('Lesson put back on the schedule', 'info')}
                        />
                      )}

                      {(state === 'UPCOMING' || state === 'NEEDS_LOG') && (
                        <button
                          type="button"
                          onClick={() => setCancellingId(cancellingId === s.id ? null : s.id)}
                          className="text-xs text-[#a3462f] border border-[#a3462f]/30 hover:bg-red-50 px-3 py-2 rounded-lg font-semibold transition-colors"
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
                    <div className="p-3.5 bg-red-50/50 border border-red-200 rounded-lg space-y-2 text-xs" onClick={(e) => e.stopPropagation()}>
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
                    <div className="p-3 bg-white/60 border border-[#ddd8cd]/60 rounded-lg text-xs space-y-1">
                      {s.topicsSummary && (
                        <p className="text-[#2b2b28]">
                          <strong>Topics Covered:</strong> {s.topicsSummary}
                        </p>
                      )}
                      {s.nextFocusTopic && (
                        <p className="text-[#2b2b28]">
                          <strong className="text-[#3d6b52]">🎯 Target:</strong> {s.nextFocusTopic}
                        </p>
                      )}
                      {s.assignedHomework && (
                        <p className="text-[#6f6b62]">
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

      {/* RATIONAL INSPECTOR MODAL */}
      {selectedSessionModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          onClick={() => setSelectedSessionModal(null)}
        >
          <div
            className="glass-panel rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#ddd8cd]/60 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-white bg-[#3d6b52] px-2.5 py-0.5 rounded">
                    {new Date(selectedSessionModal.sessionDate).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}{' '}
                    WIB
                  </span>
                  <span className="text-xs text-[#6f6b62]">
                    {selectedSessionModal.durationMinutes} mins
                  </span>
                  {getSessionState(selectedSessionModal) === 'UPCOMING' && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                      🔵 Upcoming
                    </span>
                  )}
                  {getSessionState(selectedSessionModal) === 'NEEDS_LOG' && (
                    <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-300 px-1.5 py-0.5 rounded animate-pulse">
                      🔴 Needs Log
                    </span>
                  )}
                  {getSessionState(selectedSessionModal) === 'COMPLETED' && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      🟢 Completed
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-[#2b2b28]">
                  {selectedSessionModal.studentName}
                </h3>
                <p className="text-xs text-[#6f6b62]">
                  {selectedSessionModal.courseTitle} · {selectedSessionModal.boardCode}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSessionModal(null)}
                className="text-[#6f6b62] hover:text-[#2b2b28] text-sm font-bold w-7 h-7 rounded-full bg-white/60 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            {getSessionState(selectedSessionModal) === 'COMPLETED' ? (
              <div className="space-y-3 text-xs">
                <span className="font-bold uppercase tracking-wider text-[#3d6b52] text-[10px] block">
                  Completed Session Ledger
                </span>
                {selectedSessionModal.topicsSummary && (
                  <div className="p-3 bg-white/60 border border-[#ddd8cd] rounded-lg">
                    <strong className="text-[#2b2b28] block mb-0.5">Topics Mastered & Practiced:</strong>
                    <p className="text-[#6f6b62] leading-relaxed">{selectedSessionModal.topicsSummary}</p>
                  </div>
                )}
                {selectedSessionModal.assignedHomework && (
                  <div className="p-3 bg-white/60 border border-[#ddd8cd] rounded-lg">
                    <strong className="text-[#3d6b52] block mb-0.5">Assigned Homework:</strong>
                    <p className="text-[#2b2b28]">{selectedSessionModal.assignedHomework}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <span className="font-bold uppercase tracking-wider text-[#6f6b62] text-[10px] block">
                  Pre-Session Briefing
                </span>

                {selectedSessionModal.nextFocusTopic ? (
                  <div className="p-3 bg-[#e8efe9] rounded-lg text-[#2b2b28]">
                    <strong className="text-[#3d6b52] block mb-0.5">🎯 Planned Target:</strong>
                    {selectedSessionModal.nextFocusTopic}
                  </div>
                ) : (
                  <div className="p-3 bg-white/60 border border-[#ddd8cd] rounded-lg text-[#6f6b62] italic">
                    Standard lesson progression.
                  </div>
                )}

                {selectedSessionModal.assignedHomework && (
                  <div className="p-3 bg-white/60 border border-[#ddd8cd] rounded-lg text-[#2b2b28]">
                    <strong className="text-[#6f6b62] block mb-0.5">📝 Homework to Audit:</strong>
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
                  className="w-full bg-[#e8efe9] hover:bg-[#d8e5da] text-[#3d6b52] border border-[#3d6b52]/30 py-2.5 px-4 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Launch Google Meet / Zoom</span> ↗
                </a>
              </div>
            )}

            {/* RATIONAL MODAL FOOTER */}
            <div className="pt-3 border-t border-[#ddd8cd]/60 flex items-center justify-between gap-2">
              <Link
                href={`/students/${selectedSessionModal.studentId}`}
                className="text-xs text-[#3d6b52] hover:underline font-semibold"
              >
                View Student Dossier →
              </Link>

              <div className="flex items-center gap-2">
                {/* State 1: UPCOMING (Future) */}
                {getSessionState(selectedSessionModal) === 'UPCOMING' && (
                  <span className="text-[11px] text-[#6f6b62] italic">
                    Opens at {new Date(selectedSessionModal.sessionDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} WIB
                  </span>
                )}

                {/* State 2: NEEDS_LOG (Overdue/Present) -> Passes sessionId to update existing row! */}
                {getSessionState(selectedSessionModal) === 'NEEDS_LOG' && (
                  <Link
                    href={`/sessions/new?studentId=${selectedSessionModal.studentId}&sessionId=${selectedSessionModal.id}`}
                    className="bg-[#a3462f] hover:bg-[#853623] text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
                  >
                    Log Lesson Now →
                  </Link>
                )}

                {/* State 3: COMPLETED (Done) -> Clean Close button */}
                {getSessionState(selectedSessionModal) === 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => setSelectedSessionModal(null)}
                    className="px-4 py-1.5 rounded-lg border border-[#ddd8cd] text-xs font-bold text-[#6f6b62] hover:bg-white/80"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>

            {/* Cancel section: before the lesson, and after it when it was never logged */}
            {(getSessionState(selectedSessionModal) === 'UPCOMING' ||
              getSessionState(selectedSessionModal) === 'NEEDS_LOG') && (
              <div className="pt-2 border-t border-[#ddd8cd]/40">
                <button
                  type="button"
                  onClick={() =>
                    setCancellingId(
                      cancellingId === selectedSessionModal.id ? null : selectedSessionModal.id
                    )
                  }
                  className="text-[11px] text-[#a3462f] hover:underline font-medium block mx-auto"
                >
                  Cancel or Reschedule this Class
                </button>

                {cancellingId === selectedSessionModal.id && (
                  <div className="mt-2 p-3 bg-red-50/60 border border-red-200 rounded-lg space-y-1.5 text-left text-xs">
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
              <div className="pt-2 border-t border-[#ddd8cd]/40 space-y-1 text-center">
                {selectedSessionModal.status === 'RESCHEDULED' && (
                  <p className="text-[11px] text-[#3d6b52] font-semibold">
                    {selectedSessionModal.movedTo ? (
                      <>
                        Rescheduled to{' '}
                        <button
                          type="button"
                          className="underline"
                          onClick={() => {
                            const target = sessions.find((x) => x.id === selectedSessionModal.movedTo?.id);
                            if (target) setSelectedSessionModal(target);
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
                <RevertSessionButton
                  sessionId={selectedSessionModal.id}
                  label="Reopen this lesson"
                  message={reopenMessage({
                    fineAmount: selectedSessionModal.fineAmount,
                    movedToLabel: selectedSessionModal.movedTo
                      ? formatMoved(selectedSessionModal.movedTo.sessionDate)
                      : null,
                  })}
                  className="text-[11px] text-[#3d6b52] hover:underline font-medium disabled:opacity-50"
                  onReverted={() => {
                    setSelectedSessionModal(null);
                    showToast('Lesson put back on the schedule', 'info');
                  }}
                />
              </div>
            )}

            {getSessionState(selectedSessionModal) === 'COMPLETED' && (
              <div className="pt-2 border-t border-[#ddd8cd]/40">
                <RevertSessionButton
                  sessionId={selectedSessionModal.id}
                  label="Revert to scheduled"
                  className="text-[11px] text-[#6f6b62] hover:underline font-medium block mx-auto disabled:opacity-50"
                  onReverted={() => {
                    setSelectedSessionModal(null);
                    showToast('Lesson reverted to scheduled', 'info');
                  }}
                />
              </div>
            )}

            <div className="pt-2 border-t border-[#ddd8cd]/40">
              <DeleteSessionButton
                sessionId={selectedSessionModal.id}
                completed={getSessionState(selectedSessionModal) === 'COMPLETED'}
                label="Delete this session"
                className="text-[11px] text-[#a3462f] hover:underline font-medium block mx-auto disabled:opacity-50"
                onDeleted={() => {
                  setSelectedSessionModal(null);
                  showToast('Session deleted', 'info');
                }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}