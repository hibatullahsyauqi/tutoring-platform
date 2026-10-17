'use client';

import { useDialog } from '@/components/DialogProvider';
import LiquidText from '@/components/LiquidText';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { signOutAction } from '@/app/actions/auth';
import { THEME_LABEL, useTheme } from '@/components/useTheme';
import { setTimeZoneAction } from '@/app/actions/profile';
import { useTimeZone } from '@/components/TimeZoneProvider';

/** Pointer left the corner: wait a moment before closing, so a slip off the edge doesn't snap it shut. */
const CLOSE_DELAY_MS = 260;

function Icon({ children }: { children: React.ReactNode }) {
  return (
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
}

/**
 * One settings button pinned to the top-right corner, outside the cards. Hover it (or focus it,
 * or tap it) and a glass blob swells out of the gear holding the options: Display, Time zone and
 * Sign out. Another entry (a profile link, say) is one more row below.
 */
export default function CornerControls({ savedTimeZone }: { savedTimeZone: string | null }) {
  const pathname = usePathname();
  const railRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAuthScreen = pathname === '/login' || pathname.startsWith('/auth');

  // The menu is open for one particular page, so moving to another page closes it. "pinned" means
  // it was opened by a click or tap and stays until you click elsewhere.
  const [menu, setMenu] = useState<{ path: string; pinned: boolean } | null>(null);
  const open = menu?.path === pathname;
  const pinned = open && !!menu?.pinned;
  // Stays mounted while the closing animation plays; unmounted when it finishes.
  const [rendered, setRendered] = useState(false);

  const { setting, cycle } = useTheme();
  const zone = useTimeZone();
  const dialog = useDialog();
  const [switching, setSwitching] = useState(false);
  // Only read once the menu is open, i.e. in the browser, so it can never mismatch the server.
  const deviceZone = open ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;
  const zoneDiffers = !!deviceZone && !!savedTimeZone && deviceZone !== savedTimeZone;

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const openMenu = (isPinned: boolean) => {
    cancelClose();
    setRendered(true);
    setMenu((current) => ({ path: pathname, pinned: isPinned || (current?.path === pathname && current.pinned) }));
  };
  const closeMenu = () => {
    cancelClose();
    setMenu(null);
  };
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = setTimeout(closeMenu, CLOSE_DELAY_MS);
  };

  const useDeviceZone = async () => {
    if (!deviceZone) return;
    setSwitching(true);
    try {
      await setTimeZoneAction(deviceZone);
    } catch (err) {
      console.error('Could not change the time zone.', err);
      void dialog.notify({ message: 'Could not change the time zone. Please try again.' });
    } finally {
      setSwitching(false);
    }
  };

  // Close on Escape and on a click elsewhere.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        setMenu(null);
      }
    };
    const onDown = (e: PointerEvent) => {
      if (railRef.current && !railRef.current.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
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

  const themeIcon = (
    <Icon>
      {setting === 'auto' ? (
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
      )}
    </Icon>
  );

  return (
    <div
      ref={railRef}
      className="corner-rail"
      onPointerEnter={(e) => e.pointerType === 'mouse' && openMenu(false)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && !pinned && closeSoon()}
      onFocus={() => openMenu(pinned)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node) && !pinned) closeSoon();
      }}
    >
      <button
        type="button"
        className={`glass-btn rail-icon ${open ? 'rail-open' : ''}`}
        aria-label="Settings"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Settings"
        onClick={() => (pinned ? closeMenu() : openMenu(true))}
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

      {rendered && (
        <div
          role="menu"
          aria-label="Settings"
          className={`rail-blob ${open ? '' : 'rail-blob-closing'}`}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget && !open) setRendered(false);
          }}
        >
          <button
            type="button"
            role="menuitem"
            className="rail-row"
            style={{ ['--i' as string]: 0 }}
            onClick={(e) => cycle({ x: e.clientX, y: e.clientY })}
            title="Auto switches to dark after sunset and light after sunrise, by your local time"
          >
            {themeIcon}
            <LiquidText text={`Display: ${THEME_LABEL[setting]}`} />
          </button>

          {!onAuthScreen && savedTimeZone && (
            <button
              type="button"
              role="menuitem"
              className="rail-row"
              style={{ ['--i' as string]: 1 }}
              disabled={switching || !zoneDiffers}
              onClick={useDeviceZone}
              title={
                zoneDiffers
                  ? `This device is in ${deviceZone}. Click to switch your lessons and payroll to it.`
                  : 'Lessons, the timetable and payroll use this time zone. It follows this device the first time you sign in.'
              }
            >
              <Icon>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </Icon>
              <LiquidText text={zoneDiffers ? `Switch to ${deviceZone}` : `Time zone: ${zone.label}`} />
            </button>
          )}

          {!onAuthScreen && (
            <form action={signOutAction} role="none">
              <button
                type="submit"
                role="menuitem"
                className="rail-row rail-row-danger"
                style={{ ['--i' as string]: 2 }}
              >
                <Icon>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </Icon>
                Sign out
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
