'use client';

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
      alert(describeError('Could not save. Please check the details and try again.', err));
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
    <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 shadow-sm space-y-5">
      
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
        <select
          value={selectedCourseId}
          onChange={(e) => handleCourseChange(e.target.value)}
          className="w-full p-2.5 text-sm font-medium glass-input"
        >
          {boards.map((bCode) => {
            const group = courses.filter((c) => c.boardCode === bCode);
            if (!group.length) return null;
            return (
              <optgroup key={bCode} label={boardLabels[bCode] || bCode}>
                {group.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.subjectCode})
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </div>

      {/* FLUID TIERS */}
      {selectedCourse && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-[#0f172a] uppercase tracking-wider">
              Tier / Track for {selectedCourse.boardCode}
            </label>
            <span className="text-[11px] text-[#3d6b52] font-semibold">
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
                className={`glass-inset p-3 text-left transition-all cursor-pointer ${
                  tier === t.val
                    ? 'outline outline-2 outline-[#3d6b52] text-[#2d523e] font-semibold'
                    : 'text-slate-700 opacity-90 hover:opacity-100'
                }`}
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
        <div className="flex items-center justify-between">
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
            className={`glass-btn text-xs px-3 py-1 font-bold ${
              hasTargetExam
                ? 'glass-btn-primary'
                : ''
            }`}
          >
            {hasTargetExam ? '✓ Date Active' : '+ Set Exam Date'}
          </button>
        </div>

        {hasTargetExam && (
          <div className="pt-1">
            <input
              type="date"
              required={hasTargetExam}
              value={targetExamDate}
              onChange={(e) => setTargetExamDate(e.target.value)}
              className="w-full p-2.5 text-sm glass-input"
            />
            <span className="text-[10px] text-slate-600 mt-1 block">
              Exam month/year will calculate syllabus coverage velocity against remaining weeks.
            </span>
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/10">
        <Link
          href="/"
          className="glass-btn px-4 py-2 text-xs font-bold"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="glass-btn glass-btn-primary px-5 py-2.5 text-xs font-bold"
        >
          {submitting ? 'Creating Student Dossier...' : 'Create Student & Open Dossier →'}
        </button>
      </div>

    </form>
  );
}