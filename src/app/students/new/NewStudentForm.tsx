'use client';

import LiquidPresence from '@/components/LiquidPresence';
import { useDialog } from '@/components/DialogProvider';
import GlassDatePicker from '@/components/GlassDatePicker';
import GlassSelect from '@/components/GlassSelect';
import { useState } from 'react';
import Link from 'next/link';
import { createStudentAction } from '@/app/actions/student';
import { describeError, isRedirectError } from '@/lib/errors';

type TierConfig = {
  val: string;
  label: string;
  sub: string;
};

type CourseItem = {
  id: string;
  title: string;
  subjectCode: string;
  level: string;
  boardCode: string;
  boardName: string;
  availableTiers: TierConfig[];
};

export default function NewStudentForm({ courses }: { courses: CourseItem[] }) {
  const dialog = useDialog();
  const [name, setName] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');
  const [tier, setTier] = useState(courses[0]?.availableTiers[0]?.val || 'Standard');
  
  // TRULY OPTIONAL DATE: Toggle state
  const [hasTargetExam, setHasTargetExam] = useState(false);
  const [targetExamDate, setTargetExamDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    const target = courses.find((c) => c.id === courseId);
    if (target && target.availableTiers.length > 0) {
      setTier(target.availableTiers[0].val);
    } else {
      setTier('Standard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedCourseId) return;
    if (hasTargetExam && !targetExamDate) {
      void dialog.notify({ title: 'Exam date missing', message: 'Pick the exam date, or switch the exam date off.', tone: 'info' });
      return;
    }
    setSubmitting(true);

    try {
      await createStudentAction({
        name,
        courseId: selectedCourseId,
        tier,
        targetExamDate: hasTargetExam && targetExamDate ? targetExamDate : undefined,
      });
    } catch (err) {
      if (isRedirectError(err)) throw err;
      console.error('Failed to create student:', err);
      void dialog.notify({ message: describeError('Could not save. Please check the details and try again.', err) });
      setSubmitting(false);
    }
  };

  const boards = ['CIE', 'EDEXCEL', 'IB', 'COLLEGEBOARD'];
  const boardLabels: Record<string, string> = {
    CIE: 'Cambridge Assessment International Education (CAIE)',
    EDEXCEL: 'Pearson Edexcel International',
    IB: 'International Baccalaureate (IB)',
    COLLEGEBOARD: 'College Board (USA / SAT)',
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel p-6 space-y-5">
      
      {/* STUDENT NAME */}
      <div>
        <label className="block text-xs font-bold text-[#0f172a] uppercase tracking-wider mb-1">
          Student Full Name / Preferred Name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Liam, Sophia, Maya"
          className="w-full p-2.5 text-sm glass-input"
        />
      </div>

      {/* CURRICULUM DROPDOWN */}
      <div>
        <label className="block text-xs font-bold text-[#0f172a] uppercase tracking-wider mb-1">
          Curriculum & Subject
        </label>
        <GlassSelect
          value={selectedCourseId}
          onChange={handleCourseChange}
          className="p-2.5 text-sm font-medium"
          ariaLabel="Curriculum and subject"
          options={boards.flatMap((bCode) =>
            courses
              .filter((c) => c.boardCode === bCode)
              .map((c) => ({ value: c.id, label: `${c.title} (${c.subjectCode})`, group: boardLabels[bCode] || bCode }))
          )}
        />
      </div>

      {/* FLUID TIERS */}
      {selectedCourse && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-[#0f172a] uppercase tracking-wider">
              Tier / Track for {selectedCourse.boardCode}
            </label>
            <span className="text-[11px] text-[#2d523e] font-semibold">
              {selectedCourse.level}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mb-2">
            Dynamically adapted to {selectedCourse.boardName} specifications.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {selectedCourse.availableTiers.map((t) => (
              <button
                key={t.val}
                type="button"
                onClick={() => setTier(t.val)}
                className={`glass-inset p-3 text-left transition-all  ${
                  tier === t.val
                    ? 'blob-picked outline outline-2 outline-[#3d6b52] text-[#2d523e] font-semibold'
                    : 'text-slate-700 opacity-90 hover:opacity-100'
                }  glass-interactive`}
              >
                <div className="text-xs font-bold">{t.label}</div>
                <div className="text-[10px] opacity-75 mt-0.5">{t.sub}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TRUE OPTIONAL TARGET EXAM DATE */}
      <div className="pt-2 border-t border-black/10 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <label className="text-xs font-bold text-[#0f172a] uppercase tracking-wider block">
              Target Exam Series
            </label>
            <span className="text-[11px] text-slate-600">
              {hasTargetExam ? 'An official exam deadline is configured.' : 'Ongoing tutoring / No fixed exam deadline.'}
            </span>
          </div>
          
          <button
            type="button"
            onClick={() => setHasTargetExam(!hasTargetExam)}
            className={`glass-btn glass-btn-sm  ${
              hasTargetExam
                ? 'glass-btn-primary'
                : ''
            } `}
          >
            {hasTargetExam ? '✓ Date Active' : '+ Set Exam Date'}
          </button>
        </div>

        <LiquidPresence open={hasTargetExam}>
          <div className="pt-1">
            <GlassDatePicker
              value={targetExamDate}
              onChange={setTargetExamDate}
              ariaLabel="Target exam date"
              placeholder="Pick the exam date"
              className="p-2.5 text-sm"
            />
            <span className="text-[10px] text-slate-600 mt-1 block">
              Exam month/year will calculate syllabus coverage velocity against remaining weeks.
            </span>
          </div>
        </LiquidPresence>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-black/10">
        <Link
          href="/"
          className="glass-btn"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="glass-btn glass-btn-primary"
        >
          {submitting ? 'Creating Student Dossier...' : 'Create Student & Open Dossier →'}
        </button>
      </div>

    </form>
  );
}