'use client';

import { useTransition } from 'react';
import { setTopicBaselineAction } from '@/app/actions/student';
import { describeError } from '@/lib/errors';

export default function BaselineButton({
  studentId,
  topicIds,
  covered,
  label,
  className = 'text-[11px] font-semibold text-[#2d523e] hover:underline disabled:opacity-50',
}: {
  studentId: string;
  topicIds: string[];
  covered: boolean;
  label: string;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      try {
        await setTopicBaselineAction({ studentId, topicIds, covered });
      } catch (err) {
        console.error('Failed to update prior knowledge:', err);
        alert(describeError('Could not update prior knowledge.', err));
      }
    });
  };

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={className}>
      {isPending ? 'Saving...' : label}
    </button>
  );
}
