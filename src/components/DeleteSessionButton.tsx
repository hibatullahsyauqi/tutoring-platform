'use client';

import { useTransition } from 'react';
import { deleteSessionAction } from '@/app/actions/schedule';
import { describeError } from '@/lib/errors';

export default function DeleteSessionButton({
  sessionId,
  completed,
  label = 'Delete',
  className = 'glass-btn glass-btn-danger text-xs px-3 py-1.5 font-semibold',
  onDeleted,
}: {
  sessionId: string;
  completed: boolean;
  label?: string;
  className?: string;
  onDeleted?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const message = completed
      ? 'Permanently delete this logged lesson? Its topics, notes and ratings are removed, and it stops counting toward payroll. This cannot be undone.'
      : 'Permanently delete this session? This cannot be undone.';
    if (!window.confirm(message)) return;

    startTransition(async () => {
      try {
        await deleteSessionAction(sessionId);
        onDeleted?.();
      } catch (err) {
        console.error('Failed to delete session:', err);
        alert(describeError('Could not delete this session.', err));
      }
    });
  };

  return (
    <button type="button" onClick={handleDelete} disabled={isPending} className={className}>
      {isPending ? 'Deleting...' : label}
    </button>
  );
}
