'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { signOutAction } from '@/app/actions/auth';
import { THEME_LABEL, useTheme } from '@/components/useTheme';

/**
 * One settings button pinned to the top-right corner, outside the cards. Click it and the
 * options pop out underneath: Display (theme) and Sign out. More (a profile link, say) can be
 * added as another entry in the menu below.
 */
export default function CornerControls() {
  const pathname = usePathname();
  const railRef = useRef<HTMLDivElement>(null);
  const onAuthScreen = pathname === '/login' || pathname.startsWith('/auth');
  // The menu is open for one particular page, so moving to another page closes it.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const setOpen = (value: boolean | ((current: boolean) => boolean)) => {
    const next = typeof value === 'function' ? value(open) : value;
    setOpenFor(next ? pathname : null);
  };
  const { setting, cycle } = useTheme();

  // Close on Escape, on a click elsewhere, and when the page changes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (railRef.current && !railRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Line up with the page header: it starts at the page padding, then freezes 12px from the top
  // (on wide screens) once you scroll, so the button follows the same path.
  useEffect(() => {
    let frame = 0;
    const place = () => {
      const wide = window.matchMedia('(min-width: 768px)').matches;
      const start = wide ? 40 : 24;
      const rest = wide ? 12 : 8;
      if (railRef.current) railRef.current.style.top = `${Math.max(rest, start - window.scrollY)}px`;
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
  }, []);

  const icon = (children: React.ReactNode) => (
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
      {children}
    </svg>
  );

  const themeIcon = icon(
    setting === 'auto' ? (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
      </>
    ) : setting === 'light' ? (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ) : (
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    )
  );

  return (
    <div ref={railRef} className="corner-rail">
      <button
        type="button"
        className={`glass-btn rail-icon ${open ? 'rail-open' : ''}`}
        aria-label="Settings"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Settings"
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          className="rail-gear"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      </button>

      {open && (
        <div role="menu" aria-label="Settings" className="rail-menu">
          <button
            type="button"
            role="menuitem"
            className="glass-btn rail-item"
            style={{ ['--i' as string]: 0 }}
            onClick={cycle}
            title="Auto switches to dark after sunset and light after sunrise, by your local time"
          >
            {themeIcon}
            Display: {THEME_LABEL[setting]}
          </button>

          {!onAuthScreen && (
            <form action={signOutAction} role="none">
              <button
                type="submit"
                role="menuitem"
                className="glass-btn glass-btn-danger rail-item"
                style={{ ['--i' as string]: 1 }}
              >
                {icon(
                  <>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </>
                )}
                Sign out
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
