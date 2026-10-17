'use client';

import { useTransition } from 'react';
import { restoreStudentAction } from '@/app/actions/student';
import { describeError } from '@/lib/errors';

export default function RestoreStudentButton({ studentId }: { studentId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleRestore = () => {
    startTransition(async () => {
      try {
        await restoreStudentAction(studentId);
      } catch (err) {
        console.error('Failed to restore student:', err);
        alert(describeError('Could not restore this student.', err));
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleRestore}
      disabled={isPending}
      className="glass-card-subtle hover:bg-white text-[#0f172a] text-xs font-bold px-4 py-2 rounded-2xl transition-all border border-black/10 active:scale-95 whitespace-nowrap disabled:opacity-50"
    >
      {isPending ? 'Restoring...' : 'Restore'}
    </button>
  );
}
