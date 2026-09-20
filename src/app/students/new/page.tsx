'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createStudentAction } from '@/app/actions/student';

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

export default function NewStudentPage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [tier, setTier] = useState('');
  const [hasTargetExam, setHasTargetExam] = useState(false);
  const [targetExamDate, setTargetExamDate] = useState('');

  useEffect(() => {
    async function loadCourses() {
      try {
        const res = await fetch('/api/courses');
        const data: CourseItem[] = await res.json();
        setCourses(data);
        if (data.length > 0) {
          setSelectedCourseId(data[0].id);
          setTier(data[0].availableTiers[0]?.val || 'Standard');
        }
      } catch (err) {
        console.error('Failed to load courses:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, []);

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

  // Explicit HTMLFormElement type silences React 19 FormEvent deprecation warning
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
      console.error('Failed to create student:', err);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center text-[#6f6b62]">
        Loading curriculum specifications across boards...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#2b2b28] p-6 md:p-10 font-sans">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div>
          <Link href="/" className="text-xs font-semibold text-[#3d6b52] hover:underline mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-[#2b2b28]">Onboard New Student</h1>
          <p className="text-xs text-[#6f6b62] mt-1">
            Configure student identity, board curriculum, and fluid examination tiering.
          </p>
        </div>

        {/* ONBOARDING FORM */}
        <form onSubmit={handleSubmit} className="bg-white border border-[#ddd8cd] rounded-xl p-6 shadow-sm space-y-5">
          
          {/* STUDENT NAME */}
          <div>
            <label className="block text-xs font-bold text-[#2b2b28] uppercase tracking-wider mb-1">
              Student Full Name / Preferred Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Liam, Sophia, Maya"
              className="w-full bg-[#faf9f6] border border-[#ddd8cd] rounded-lg p-2.5 text-sm focus:border-[#3d6b52] focus:outline-none"
            />
          </div>

          {/* CURRICULUM DROPDOWN */}
          <div>
            <label className="block text-xs font-bold text-[#2b2b28] uppercase tracking-wider mb-1">
              Curriculum & Subject
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full bg-[#faf9f6] border border-[#ddd8cd] rounded-lg p-2.5 text-sm font-medium focus:border-[#3d6b52] focus:outline-none"
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
                <label className="block text-xs font-bold text-[#2b2b28] uppercase tracking-wider">
                  Tier / Track for {selectedCourse.boardCode}
                </label>
                <span className="text-[11px] text-[#3d6b52] font-semibold">
                  {selectedCourse.level}
                </span>
              </div>
              <p className="text-[11px] text-[#6f6b62] mb-2">
                Dynamically adapted to {selectedCourse.boardName} specifications.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedCourse.availableTiers.map((t) => (
                  <button
                    key={t.val}
                    type="button"
                    onClick={() => setTier(t.val)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      tier === t.val
                        ? 'bg-[#e8efe9] border-[#3d6b52] text-[#3d6b52] font-semibold'
                        : 'bg-[#faf9f6] border-[#ddd8cd] text-[#6f6b62] hover:bg-white'
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
          <div className="pt-2 border-t border-[#ddd8cd]/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-[#2b2b28] uppercase tracking-wider block">
                  Target Exam Series
                </label>
                <span className="text-[11px] text-[#6f6b62]">
                  {hasTargetExam ? 'An official exam deadline is configured.' : 'Ongoing tutoring / No fixed exam deadline.'}
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => setHasTargetExam(!hasTargetExam)}
                className={`text-xs px-3 py-1 rounded-full font-bold border transition-colors ${
                  hasTargetExam
                    ? 'bg-[#3d6b52] text-white border-[#3d6b52]'
                    : 'bg-[#faf9f6] text-[#6f6b62] border-[#ddd8cd] hover:bg-[#e8efe9]'
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
                  className="w-full bg-[#faf9f6] border border-[#ddd8cd] rounded-lg p-2.5 text-sm focus:border-[#3d6b52] focus:outline-none"
                />
                <span className="text-[10px] text-[#6f6b62] mt-1 block">
                  Exam month/year will calculate syllabus coverage velocity against remaining weeks.
                </span>
              </div>
            )}
          </div>

          {/* ACTIONS */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#ddd8cd]/50">
            <Link
              href="/"
              className="px-4 py-2 rounded-lg border border-[#ddd8cd] text-xs font-bold text-[#6f6b62] hover:bg-[#faf9f6]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="bg-[#3d6b52] hover:bg-[#2d523e] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Creating Student Dossier...' : 'Create Student & Open Dossier →'}
            </button>
          </div>

        </form>

      </div>
    </main>
  );
}