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
      `Archive ${studentName}? They will disappear from your dashboard and schedule, but completed sessions still count toward payroll.`
    );

    if (confirmed) {
      startTransition(async () => {
        try {
          await deleteStudentAction(studentId);
        } catch (err) {
          console.error('Failed to delete student:', err);
          alert('Could not archive this student.');
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
      {isPending ? 'Archiving...' : 'Archive Profile'}
    </button>
  );
}