'use client';

import { useState, useTransition } from 'react';
import { deleteStudentAction } from '@/app/actions/student';

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
      `Are you sure you want to permanently delete ${studentName} and all associated session logs? This cannot be undone.`
    );

    if (confirmed) {
      startTransition(async () => {
        try {
          await deleteStudentAction(studentId);
        } catch (err) {
          console.error('Failed to delete student:', err);
        }
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="text-xs text-[#a3462f] border border-[#a3462f]/30 hover:bg-red-50 px-3 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
    >
      {isPending ? 'Deleting...' : 'Delete Profile'}
    </button>
  );
}