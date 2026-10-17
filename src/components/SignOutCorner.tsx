'use client';

import { usePathname } from 'next/navigation';
import { signOutAction } from '@/app/actions/auth';

/** Sign out from any page: pinned to the top-right corner, outside the cards. */
export default function SignOutCorner() {
  const pathname = usePathname();
  if (pathname === '/login' || pathname.startsWith('/auth')) return null;

  return (
    <form action={signOutAction} className="signout-corner">
      <button type="submit" className="glass-btn glass-btn-danger signout-btn" aria-label="Sign out" title="Sign out">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span className="signout-label">Sign out</span>
      </button>
    </form>
  );
}
