'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { signOutAction } from '@/app/actions/auth';

/** Sign out from any page: pinned to the top-right corner, outside the cards. */
export default function SignOutCorner() {
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const hidden = pathname === '/login' || pathname.startsWith('/auth');

  // Line up with the page header: it starts at the page padding, then freezes 12px from the top
  // (on wide screens) once you scroll, so the button follows the same path.
  useEffect(() => {
    if (hidden) return;
    let frame = 0;
    const place = () => {
      const wide = window.matchMedia('(min-width: 768px)').matches;
      const start = wide ? 40 : 24;
      const rest = wide ? 12 : 8;
      if (formRef.current) formRef.current.style.top = `${Math.max(rest, start - window.scrollY)}px`;
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    place();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [hidden]);

  if (hidden) return null;

  return (
    <form ref={formRef} action={signOutAction} className="signout-corner">
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
