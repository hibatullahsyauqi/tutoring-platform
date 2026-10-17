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
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className={className}
      aria-label={label}
      title={label}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0"
      >
        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
      </svg>
      <span className="delete-label">{isPending ? 'Deleting...' : label}</span>
    </button>
  );
}
