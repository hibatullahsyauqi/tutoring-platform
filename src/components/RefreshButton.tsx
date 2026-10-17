'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

/** Re-fetches the page's server data without a full reload; keeps form and scroll state. */
export default function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="glass-btn"
      disabled={isPending}
      aria-label="Refresh this page"
      onClick={() => startTransition(() => router.refresh())}
    >
      <span className={`inline-block ${isPending ? 'animate-spin' : ''}`} aria-hidden="true">
        ↻
      </span>
      Refresh
    </button>
  );
}
