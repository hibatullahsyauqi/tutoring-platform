'use client';

import { splitQuestion, useDialog } from '@/components/DialogProvider';
import { useTransition } from 'react';
import { revertSessionToScheduledAction } from '@/app/actions/schedule';
import { describeError } from '@/lib/errors';

export default function RevertSessionButton({
  sessionId,
  label = 'Revert to scheduled',
  message = 'Revert this lesson to scheduled? Its topics, notes and ratings are cleared and it stops counting toward payroll until you log it again. The date, homework and next focus are kept.',
  className = 'glass-btn glass-btn-sm',
  onReverted,
}: {
  sessionId: string;
  label?: string;
  message?: string;
  className?: string;
  onReverted?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const dialog = useDialog();

  const handleRevert = async () => {
    const { title, body } = splitQuestion(message, 'Put this lesson back on the schedule?');
    const confirmed = await dialog.confirm({ title, message: body, confirmLabel: label === 'Revert to scheduled' ? 'Revert' : 'Reopen' });
    if (!confirmed) return;

    startTransition(async () => {
      try {
        await revertSessionToScheduledAction(sessionId);
        onReverted?.();
      } catch (err) {
        console.error('Failed to revert session:', err);
        void dialog.notify({ message: describeError('Could not revert this session.', err) });
      }
    });
  };

  return (
    <button type="button" onClick={handleRevert} disabled={isPending} className={className}>
      {isPending ? 'Reverting...' : label}
    </button>
  );
}
