'use client';

import { useState } from 'react';

/**
 * Text that changes with a liquid swap: the old words sink away in a blur while the new ones
 * rise in and settle. Nothing animates on first render, only when `text` changes. Use `clip`
 * inside a truncating box (a dropdown's value, say).
 */
export default function LiquidText({
  text,
  className = '',
  clip = false,
}: {
  text: string;
  className?: string;
  clip?: boolean;
}) {
  const [shown, setShown] = useState(text);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [changes, setChanges] = useState(0);

  if (text !== shown) {
    setLeaving(shown);
    setShown(text);
    setChanges((c) => c + 1);
  }

  return (
    <span className={`liquid-text ${clip ? 'liquid-text-clip' : ''} ${className}`}>
      {leaving !== null && (
        <span
          key={`out-${changes}`}
          aria-hidden="true"
          className="liquid-text-out"
          onAnimationEnd={() => setLeaving(null)}
        >
          {leaving}
        </span>
      )}
      <span key={`in-${changes}`} className={changes > 0 ? 'liquid-text-in' : ''}>
        {shown}
      </span>
    </span>
  );
}
