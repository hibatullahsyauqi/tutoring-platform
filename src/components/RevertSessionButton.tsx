'use client';

import { useTransition } from 'react';
import { revertSessionToScheduledAction } from '@/app/actions/schedule';
import { describeError } from '@/lib/errors';

export default function RevertSessionButton({
  sessionId,
  label = 'Revert to scheduled',
  message = 'Revert this lesson to scheduled? Its topics, notes and ratings are cleared and it stops counting toward payroll until you log it again. The date, homework and next focus are kept.',
  className = 'text-xs text-[#6f6b62] hover:underline font-medium disabled:opacity-50',
  onReverted,
}: {
  sessionId: string;
  label?: string;
  message?: string;
  className?: string;
  onReverted?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleRevert = () => {
    if (!window.confirm(message)) return;

    startTransition(async () => {
      try {
        await revertSessionToScheduledAction(sessionId);
        onReverted?.();
      } catch (err) {
        console.error('Failed to revert session:', err);
        alert(describeError('Could not revert this session.', err));
      }
    });
  };

  return (
    <button type="button" onClick={handleRevert} disabled={isPending} className={className}>
      {isPending ? 'Reverting...' : label}
    </button>
  );
}
