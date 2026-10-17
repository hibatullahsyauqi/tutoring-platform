'use client';

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

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Archive ${studentName}? They will disappear from your dashboard and schedule, but completed sessions still count toward payroll.`
    );

    if (confirmed) {
      startTransition(async () => {
        try {
          await deleteStudentAction(studentId);
        } catch (err) {
          if (isRedirectError(err)) throw err;
          console.error('Failed to delete student:', err);
          alert(describeError('Could not archive this student.', err));
        }
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="glass-btn glass-btn-danger text-xs px-3 py-2 font-semibold"
    >
      {isPending ? 'Archiving...' : 'Archive Profile'}
    </button>
  );
}