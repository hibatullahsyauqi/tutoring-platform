'use client';

import { useState } from 'react';

/**
 * Shows its children while `open`, melting in when it opens and sinking out (height collapsing
 * with it) when it closes, instead of popping in and out. Children stay mounted until the exit
 * animation has finished.
 */
export default function LiquidPresence({
  open,
  children,
  className = '',
}: {
  open: boolean;
  children: React.ReactNode;
  /** Classes for the wrapper, e.g. "basis-full" when it sits inside a flex row. */
  className?: string;
}) {
  // "present" lags behind "open" by the length of the exit animation.
  const [present, setPresent] = useState(open);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setPresent(true);
  }

  if (!open && !present) return null;

  return (
    <div
      className={`liquid-presence ${open ? '' : 'is-closing'} ${className}`}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget && !open) setPresent(false);
      }}
    >
      <div className={`liquid-presence-inner ${open ? 'liquid-in' : ''}`}>{children}</div>
    </div>
  );
}
