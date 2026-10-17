'use client';

import { useDialog } from '@/components/DialogProvider';
import { useTransition } from 'react';
import { deleteSessionAction } from '@/app/actions/schedule';
import { describeError } from '@/lib/errors';

export default function DeleteSessionButton({
  sessionId,
  completed,
  label = 'Delete',
  className = 'glass-btn glass-btn-sm glass-btn-danger',
  onDeleted,
}: {
  sessionId: string;
  completed: boolean;
  label?: string;
  className?: string;
  onDeleted?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const dialog = useDialog();

  const handleDelete = async () => {
    const confirmed = await dialog.confirm({
      title: completed ? 'Delete this logged lesson?' : 'Delete this session?',
      message: completed
        ? 'Its topics, notes and ratings are removed, and it stops counting toward payroll. This cannot be undone.'
        : 'This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;

    startTransition(async () => {
      try {
        await deleteSessionAction(sessionId);
        onDeleted?.();
      } catch (err) {
        console.error('Failed to delete session:', err);
        void dialog.notify({ message: describeError('Could not delete this session.', err) });
      }
    });
  };

  return (
    <button type="button" onClick={handleDelete} disabled={isPending} className={className}>
      {isPending ? 'Deleting...' : label}
    </button>
  );
}
