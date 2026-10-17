'use client';

import { useLeavingRow } from '@/components/LeavingRow';
import { useDialog } from '@/components/DialogProvider';
import { useState, useTransition } from 'react';
import { deleteStudentAction } from '@/app/actions/student';
import { describeError, isRedirectError } from '@/lib/errors';

export default function DeleteStudentButton({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const dialog = useDialog();
  const row = useLeavingRow();

  const handleDelete = async () => {
    const confirmed = await dialog.confirm({
      title: `Archive ${studentName}?`,
      message: 'They will disappear from your dashboard and schedule, but completed sessions still count toward payroll.',
      confirmLabel: 'Archive',
      tone: 'danger',
    });

    if (confirmed) {
      row?.setLeaving(true);
      startTransition(async () => {
        try {
          await deleteStudentAction(studentId);
        } catch (err) {
          if (isRedirectError(err)) throw err;
          console.error('Failed to delete student:', err);
          row?.setLeaving(false);
          void dialog.notify({ message: describeError('Could not archive this student.', err) });
        }
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="glass-btn glass-btn-danger"
    >
      {isPending ? 'Archiving...' : 'Archive Profile'}
    </button>
  );
}