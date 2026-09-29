'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { createSessionAction, type MasteryStatus } from '@/app/actions/session';
import { ActivityType, SessionType } from '@prisma/client';

type StudentItem = {
  id: string;
  name: string;
  courseId: string;
  courseTitle: string;
  topics: { id: string; code: string; title: string }[];
};

type ToolItem = {
  id: string;
  name: string;
  category: string;
};

// Formats true local time string (YYYY-MM-DDTHH:mm)
const getNowLocalISO = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

export default function SessionForm({
  students,
  tools,
  preselectedStudentId,
  existingSessionId,
}: {
  students: StudentItem[];
  tools: ToolItem[];
  preselectedStudentId?: string;
  existingSessionId?: string;
}) {
  const [isPending, startTransition] = useTransition();

  const initialStudentId =
    preselectedStudentId && students.some((s) => s.id === preselectedStudentId)
      ? preselectedStudentId
      : students[0]?.id || '';

  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId);
  const [sessionDate, setSessionDate] = useState(getNowLocalISO());
  const [dateWarning, setDateWarning] = useState<string | null>(null);

  const [durationMinutes, setDurationMinutes] = useState(90);
  const [sessionType, setSessionType] = useState<SessionType>('REGULAR_LESSON');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [recordingUrl, setRecordingUrl] = useState('');
  const [latenessMinutes, setLatenessMinutes] = useState(0);

  const activeStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  // ACTIVE CLAMPING: Rejects keyboard bypass of future dates/times
  const handleDateChange = (val: string) => {
    const selected = new Date(val);
    const now = new Date();

    if (selected > now) {
      // Future time typed! Clamp immediately to now
      setSessionDate(getNowLocalISO());
      setDateWarning('Future times are not permitted for completed logs. Clamped to current time.');
      setTimeout(() => setDateWarning(null), 3500);
    } else {
      setSessionDate(val);
      setDateWarning(null);
    }
  };

  const [segments, setSegments] = useState<
    {
      topicId: string;
      customTopicTitle?: string;
      toolId: string;
      durationMinutes: number;
      activityType: ActivityType;
      masteryStatus: MasteryStatus;
    }[]
  >([
    {
      topicId: activeStudent?.topics[0]?.id || '',
      customTopicTitle: activeStudent?.topics.length ? '' : 'General Lesson / Problem Solving',
      toolId: tools[0]?.id || '',
      durationMinutes: 45,
      activityType: 'DIRECT_EXPLANATION',
      masteryStatus: 'NEEDS_PRACTICE',
    },
  ]);

  const [struggle, setStruggle] = useState('');
  const [workedWell, setWorkedWell] = useState('');
  const [adjustNext, setAdjustNext] = useState('');
  const [assignedHomework, setAssignedHomework] = useState('');
  const [nextFocusTopic, setNextFocusTopic] = useState('');

  const handleStudentChange = (newStudentId: string) => {
    setSelectedStudentId(newStudentId);
    const newStudent = students.find((s) => s.id === newStudentId);
    if (newStudent) {
      setSegments([
        {
          topicId: newStudent.topics[0]?.id || '',
          customTopicTitle: newStudent.topics.length ? '' : 'General Lesson / Problem Solving',
          toolId: tools[0]?.id || '',
          durationMinutes: 45,
          activityType: 'DIRECT_EXPLANATION',
          masteryStatus: 'NEEDS_PRACTICE',
        },
      ]);
    }
  };

  const addSegment = () => {
    setSegments([
      ...segments,
      {
        topicId: activeStudent?.topics[0]?.id || '',
        customTopicTitle: activeStudent?.topics.length ? '' : 'Topic Exploration',
        toolId: tools[0]?.id || '',
        durationMinutes: 45,
        activityType: 'GUIDED_PRACTICE',
        masteryStatus: 'NEEDS_PRACTICE',
      },
    ]);
  };

  const removeSegment = (index: number) => {
    setSegments(segments.filter((_, i) => i !== index));
  };

  const hasStruggling = segments.some((s) => s.masteryStatus === 'STRUGGLING');
  const allMastered = segments.length > 0 && segments.every((s) => s.masteryStatus === 'MASTERED');

  const continuityMode = hasStruggling ? 'STRUGGLING' : allMastered ? 'MASTERED' : 'NEEDS_PRACTICE';

  const continuityConfig = {
    STRUGGLING: {
      badge: '🔴 Diagnostic Repair & Warm-up Mode',
      badgeColor: 'bg-[#a3462f]/10 text-[#a3462f] border-[#a3462f]/20',
      box1Label: '⚠️ Stumbling Block to Revisit (Next 2-Min Warm-up)',
      box1Color: 'text-[#a3462f]',
      box1Border: 'focus:border-[#a3462f]',
      box1Placeholder: 'e.g. Struggled with sign conversion or negative exponents. Re-open simulation next session.',
      box2Label: '💡 Micro-Breakthrough / What Resonated Today',
      box2Placeholder: 'e.g. Visualizing the curve helped, but algebraic component resolution was shaky.',
      homeworkPlaceholder: 'e.g. 3 targeted scaffolded problems on resolving forces.',
      targetPlaceholder: 'e.g. 2-minute warm-up on vectors, then retry inclined plane problem.',
    },
    NEEDS_PRACTICE: {
      badge: '🟡 Fluency & Deliberate Practice Mode',
      badgeColor: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
      box1Label: '🔄 Fluency Focus & Friction Points',
      box1Color: 'text-amber-700',
      box1Border: 'focus:border-amber-600',
      box1Placeholder: 'e.g. Concept is clear, but arithmetic slips when calculating units. Needs timed drill.',
      box2Label: '💡 Effective Mental Model / Analogy Today',
      box2Placeholder: 'e.g. Visual comparison with a pendulum made harmonic motion click immediately.',
      homeworkPlaceholder: 'e.g. Textbook p.88 #2-6 (interleaved mixed set).',
      targetPlaceholder: 'e.g. 5-min speed drill, then advance to conservation laws.',
    },
    MASTERED: {
      badge: '🟢 Acceleration & Stretch Challenge Mode',
      badgeColor: 'bg-[#3d6b52]/10 text-[#3d6b52] border-[#3d6b52]/20',
      box1Label: '🚀 Stretch Challenge & Advanced Exam Twist',
      box1Color: 'text-[#3d6b52]',
      box1Border: 'focus:border-[#3d6b52]',
      box1Placeholder: 'e.g. Completely autonomous. Ready for past paper structured questions or Olympiad stretch.',
      box2Label: '💡 Key Autonomy & Student Insights',
      box2Placeholder: 'e.g. Derived the conservation formula cold with zero tutor prompting.',
      homeworkPlaceholder: 'e.g. Past Paper 42 (May/June 2023) Q5 & Q7.',
      targetPlaceholder: 'e.g. Advance directly to the next syllabus module.',
    },
  }[continuityMode];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeStudent) return;

    // Final safety check against future time before dispatching to server
    if (new Date(sessionDate) > new Date()) {
      setDateWarning('Future times are strictly forbidden.');
      return;
    }

    startTransition(async () => {
      try {
        await createSessionAction({
          existingSessionId,
          studentId: activeStudent.id,
          courseId: activeStudent.courseId,
          sessionDate,
          durationMinutes,
          sessionType,
          meetingUrl,
          recordingUrl,
          latenessMinutes,
          assignedHomework,
          nextFocusTopic,
          segments: segments.map((seg) => ({
            topicId: seg.topicId || (activeStudent.topics[0]?.id ?? '00000000-0000-0000-0000-000000000000'),
            toolId: seg.toolId || undefined,
            durationMinutes: seg.durationMinutes,
            activityType: seg.activityType,
            masteryStatus: seg.masteryStatus,
          })),
          reflection: { struggle, workedWell, adjustNext },
        });
      } catch (err) {
        console.error('Failed to save session:', err);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* SECTION 1: CORE SESSION METADATA */}
      <section className="bg-white border border-[#ddd8cd] rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#6f6b62]">1. Session Details</h2>
          {existingSessionId && (
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200">
              Updating Scheduled Booking
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#6f6b62] mb-1">Student</label>
            <select
              value={selectedStudentId}
              onChange={(e) => handleStudentChange(e.target.value)}
              className="w-full bg-[#faf9f6] border border-[#ddd8cd] rounded-lg p-2.5 text-sm font-medium"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.courseTitle}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6f6b62] mb-1">Session Type</label>
            <select
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value as SessionType)}
              className="w-full bg-[#faf9f6] border border-[#ddd8cd] rounded-lg p-2.5 text-sm font-medium"
            >
              <option value="REGULAR_LESSON">Regular Lesson (Standard Flow)</option>
              <option value="TRIAL_CLASS">Trial Class (New Prospect)</option>
              <option value="CONCEPT_INTRO">Concept Introduction (Deep Dive)</option>
              <option value="REVISION_RECALL">Revision & Interleaving</option>
              <option value="EXAM_SIMULATION">Past Paper Mock Simulation</option>
              <option value="HOMEWORK_HELP">Homework Assistance / School Prep</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#6f6b62]">Date & Time Concluded</label>
              <span className="text-[10px] text-[#6f6b62] font-medium">Past & current only</span>
            </div>
            {/* Actively guarded input */}
            <input
              type="datetime-local"
              value={sessionDate}
              max={getNowLocalISO()}
              onChange={(e) => handleDateChange(e.target.value)}
              className={`w-full bg-[#faf9f6] border rounded-lg p-2 text-sm focus:outline-none ${
                dateWarning ? 'border-[#a3462f] bg-red-50/20' : 'border-[#ddd8cd] focus:border-[#3d6b52]'
              }`}
            />
            {dateWarning && (
              <p className="text-[11px] text-[#a3462f] font-semibold mt-1 animate-in fade-in duration-150">
                {dateWarning}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6f6b62] mb-1">Duration (Minutes)</label>
            <input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full bg-[#faf9f6] border border-[#ddd8cd] rounded-lg p-2 text-sm focus:outline-none focus:border-[#3d6b52]"
            />
          </div>
        </div>

        {/* Logistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-[#ddd8cd]/50">
          <div>
            <label className="block text-xs font-semibold text-[#6f6b62] mb-1">Lateness (Minutes)</label>
            <input
              type="number"
              value={latenessMinutes}
              onChange={(e) => setLatenessMinutes(Number(e.target.value))}
              placeholder="0"
              className="w-full bg-[#faf9f6] border border-[#ddd8cd] rounded-lg p-2 text-sm focus:outline-none focus:border-[#3d6b52]"
            />
            <span className="text-[11px] text-[#a3462f]">≥15m unexcused triggers fine</span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6f6b62] mb-1">Meeting Link (Zoom / Meet)</label>
            <input
              type="text"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://meet..."
              className="w-full bg-[#faf9f6] border border-[#ddd8cd] rounded-lg p-2 text-sm focus:outline-none focus:border-[#3d6b52]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6f6b62] mb-1">Class Recording Link</label>
            <input
              type="text"
              value={recordingUrl}
              onChange={(e) => setRecordingUrl(e.target.value)}
              placeholder="https://drive..."
              className="w-full bg-[#faf9f6] border border-[#ddd8cd] rounded-lg p-2 text-sm focus:outline-none focus:border-[#3d6b52]"
            />
          </div>
        </div>
      </section>

      {/* SECTION 2: TOPICS COVERED & MASTERY */}
      <section className="bg-white border border-[#ddd8cd] rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#6f6b62]">2. Topics Covered & Mastery</h2>
            <p className="text-xs text-[#6f6b62]">Track how deeply the student grasps each concept</p>
          </div>
          <button
            type="button"
            onClick={addSegment}
            className="text-xs bg-[#e8efe9] hover:bg-[#d8e5da] text-[#3d6b52] font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            + Add Topic Block
          </button>
        </div>

        <div className="space-y-4">
          {segments.map((seg, idx) => (
            <div key={idx} className="p-4 bg-[#faf9f6] border border-[#ddd8cd] rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#3d6b52]">Block #{idx + 1}</span>
                {segments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSegment(idx)}
                    className="text-xs text-[#a3462f] hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-[#6f6b62] mb-1">
                    {activeStudent?.topics.length ? 'Syllabus Topic' : 'Custom / Unseeded Topic'}
                  </label>
                  {activeStudent?.topics.length ? (
                    <select
                      value={seg.topicId}
                      onChange={(e) => {
                        const updated = [...segments];
                        updated[idx].topicId = e.target.value;
                        setSegments(updated);
                      }}
                      className="w-full bg-white border border-[#ddd8cd] rounded p-2 text-xs font-medium"
                    >
                      {activeStudent.topics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.code} — {t.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={seg.customTopicTitle || ''}
                      onChange={(e) => {
                        const updated = [...segments];
                        updated[idx].customTopicTitle = e.target.value;
                        setSegments(updated);
                      }}
                      placeholder="e.g. Kinematics & Projectile Motion"
                      className="w-full bg-white border border-[#ddd8cd] rounded p-2 text-xs font-medium"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#6f6b62] mb-1">Tool / Visual Medium</label>
                  <select
                    value={seg.toolId}
                    onChange={(e) => {
                      const updated = [...segments];
                      updated[idx].toolId = e.target.value;
                      setSegments(updated);
                    }}
                    className="w-full bg-white border border-[#ddd8cd] rounded p-2 text-xs"
                  >
                    <option value="">No Special Tool</option>
                    {tools.map((tl) => (
                      <option key={tl.id} value={tl.id}>
                        {tl.name} ({tl.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#6f6b62] mb-1">Activity</label>
                  <select
                    value={seg.activityType}
                    onChange={(e) => {
                      const updated = [...segments];
                      updated[idx].activityType = e.target.value as ActivityType;
                      setSegments(updated);
                    }}
                    className="w-full bg-white border border-[#ddd8cd] rounded p-2 text-xs"
                  >
                    <option value="DIRECT_EXPLANATION">Concept Explanation (Socratic)</option>
                    <option value="TOOL_EXPLORATION">Interactive Simulation / Dragging Sliders</option>
                    <option value="GUIDED_PRACTICE">Guided Practice (Scaffolded)</option>
                    <option value="INDEPENDENT_DRILL">Independent Problem Solving</option>
                    <option value="ERROR_ANALYSIS">Past Paper Mistake Analysis</option>
                  </select>
                </div>
              </div>

              {/* Mastery Pills */}
              <div className="pt-2 border-t border-[#ddd8cd]/40">
                <label className="block text-xs font-bold text-[#2b2b28] mb-1.5">
                  Student Mastery for this Topic
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'STRUGGLING', label: '🔴 Struggling', desc: "Concept hasn't clicked yet" },
                    { val: 'NEEDS_PRACTICE', label: '🟡 Developing', desc: 'Understands logic, prone to slip-ups' },
                    { val: 'MASTERED', label: '🟢 Mastered', desc: 'Applies autonomously with fluency' },
                  ].map((status) => (
                    <button
                      key={status.val}
                      type="button"
                      onClick={() => {
                        const updated = [...segments];
                        updated[idx].masteryStatus = status.val as MasteryStatus;
                        setSegments(updated);
                      }}
                      className={`p-2 rounded-lg text-left border transition-all ${
                        seg.masteryStatus === status.val
                          ? 'bg-[#e8efe9] border-[#3d6b52] text-[#3d6b52] font-semibold'
                          : 'bg-white border-[#ddd8cd] text-[#6f6b62] hover:bg-[#faf9f6]'
                      }`}
                    >
                      <div className="text-xs">{status.label}</div>
                      <div className="text-[10px] opacity-75 mt-0.5">{status.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3: CONTINUITY BRIDGE */}
      <section className="bg-white border border-[#ddd8cd] rounded-xl p-5 space-y-4 shadow-sm transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#ddd8cd]/50 pb-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#6f6b62]">
              3. Next Session Continuity Bridge
            </h2>
            <p className="text-xs text-[#6f6b62]">
              Dynamically tuned based on the mastery level you observed above
            </p>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${continuityConfig.badgeColor}`}>
            {continuityConfig.badge}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-bold mb-1 ${continuityConfig.box1Color}`}>
              {continuityConfig.box1Label}
            </label>
            <textarea
              value={struggle}
              onChange={(e) => setStruggle(e.target.value)}
              placeholder={continuityConfig.box1Placeholder}
              className={`w-full bg-[#faf9f6] border border-[#ddd8cd] rounded-lg p-2.5 text-xs h-24 ${continuityConfig.box1Border}`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-[#3d6b52]">
              {continuityConfig.box2Label}
            </label>
            <textarea
              value={workedWell}
              onChange={(e) => setWorkedWell(e.target.value)}
              placeholder={continuityConfig.box2Placeholder}
              className="w-full bg-[#faf9f6] border border-[#ddd8cd] rounded-lg p-2.5 text-xs h-24 focus:border-[#3d6b52]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#ddd8cd]/50">
          <div>
            <label className="block text-xs font-semibold text-[#6f6b62] mb-1">
              📝 Assigned Homework (Interleaved Practice)
            </label>
            <input
              type="text"
              value={assignedHomework}
              onChange={(e) => setAssignedHomework(e.target.value)}
              placeholder={continuityConfig.homeworkPlaceholder}
              className="w-full bg-[#faf9f6] border border-[#ddd8cd] rounded-lg p-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6f6b62] mb-1">
              🎯 Next Session Objective
            </label>
            <input
              type="text"
              value={nextFocusTopic}
              onChange={(e) => setNextFocusTopic(e.target.value)}
              placeholder={continuityConfig.targetPlaceholder}
              className="w-full bg-[#faf9f6] border border-[#ddd8cd] rounded-lg p-2 text-xs"
            />
          </div>
        </div>
      </section>

      {/* ACTIONS */}
      <div className="flex justify-end gap-3 pt-2">
        <Link
          href="/"
          className="px-5 py-2.5 rounded-lg border border-[#ddd8cd] text-xs font-bold text-[#6f6b62] hover:bg-[#faf9f6]"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="bg-[#3d6b52] hover:bg-[#2d523e] text-white px-6 py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
        >
          {isPending ? 'Saving...' : existingSessionId ? 'Complete & Log Scheduled Lesson' : 'Save Session & Bridge Next Lesson'}
        </button>
      </div>
    </form>
  );
}