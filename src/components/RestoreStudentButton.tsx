'use client';

import { useDialog } from '@/components/DialogProvider';
import { useTransition } from 'react';
import { restoreStudentAction } from '@/app/actions/student';
import { describeError } from '@/lib/errors';

export default function RestoreStudentButton({ studentId }: { studentId: string }) {
  const [isPending, startTransition] = useTransition();
  const dialog = useDialog();

  const handleRestore = () => {
    startTransition(async () => {
      try {
        await restoreStudentAction(studentId);
      } catch (err) {
        console.error('Failed to restore student:', err);
        void dialog.notify({ message: describeError('Could not restore this student.', err) });
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleRestore}
      disabled={isPending}
      className="glass-btn whitespace-nowrap"
    >
      {isPending ? 'Restoring...' : 'Restore'}
    </button>
  );
}
