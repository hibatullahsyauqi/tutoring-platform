'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { deleteStudentAction, restoreStudentAction } from '@/app/actions/student';
import { useDialog } from '@/components/DialogProvider';
import { useLeavingRow } from '@/components/LeavingRow';
import { describeError } from '@/lib/errors';

/**
 * Archives straight away and offers Undo for a few seconds, instead of asking first: archiving
 * is reversible (nothing is deleted, payroll history stays), so a confirmation only slows it down.
 */
export default function DeleteStudentButton({
  studentId,
  studentName,
  redirectTo,
}: {
  studentId: string;
  studentName: string;
  /** Where to go once archived, e.g. "/" when the button sits on the student's own page. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const dialog = useDialog();
  const row = useLeavingRow();

  const undo = async () => {
    try {
      await restoreStudentAction(studentId);
      dialog.toast({ text: `${studentName} restored` });
    } catch (err) {
      void dialog.notify({ message: describeError('Could not restore this student.', err) });
    }
  };

  const handleArchive = () => {
    row?.setLeaving(true);
    startTransition(async () => {
      try {
        await deleteStudentAction(studentId);
        dialog.toast({
          text: `${studentName} archived`,
          tone: 'info',
          durationMs: 8000,
          action: { label: 'Undo', onClick: undo },
        });
        if (redirectTo) router.push(redirectTo);
      } catch (err) {
        console.error('Failed to archive student:', err);
        row?.setLeaving(false);
        void dialog.notify({ message: describeError('Could not archive this student.', err) });
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleArchive}
      disabled={isPending}
      className="glass-btn glass-btn-danger"
    >
      {isPending ? 'Archiving...' : 'Archive Profile'}
    </button>
  );
}
