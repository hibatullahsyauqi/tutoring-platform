'use client';

import Link from 'next/link';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export type BlobTab = {
  key: string;
  label: string;
  /** A link tab navigates; a button tab calls onSelect. */
  href?: string;
};

type Box = { x: number; y: number; w: number; h: number };

/**
 * A row of tabs where one glass blob marks the active tab and stretches across to the next one
 * when you pick it. Works as buttons (onSelect) or as links (href on each tab).
 */
export default function BlobTabs({
  tabs,
  active,
  onSelect,
  ariaLabel,
  className = '',
}: {
  tabs: BlobTab[];
  active: string;
  onSelect?: (key: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [moving, setMoving] = useState(false);
  const first = useRef(true);

  const measure = useCallback(() => {
    const el = rootRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    if (!el) return;
    setBox({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
  }, []);

  useLayoutEffect(() => {
    measure();
    if (first.current) {
      first.current = false;
    } else {
      setMoving(true);
    }
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [active, tabs.length, measure]);

  const itemClass = (key: string) => `blob-tab ${key === active ? 'is-active' : ''}`;

  return (
    <div ref={rootRef} role="tablist" aria-label={ariaLabel} className={`blob-tabs ${className}`}>
      {box && (
        <span
          aria-hidden="true"
          className={`blob-indicator ${moving ? 'is-moving' : ''}`}
          style={{ translate: `${box.x}px ${box.y}px`, width: box.w, height: box.h }}
          onAnimationEnd={() => setMoving(false)}
        />
      )}
      {tabs.map((tab) =>
        tab.href ? (
          <Link
            key={tab.key}
            href={tab.href}
            role="tab"
            aria-selected={tab.key === active}
            data-active={tab.key === active}
            className={itemClass(tab.key)}
            scroll={false}
          >
            {tab.label}
          </Link>
        ) : (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={tab.key === active}
            data-active={tab.key === active}
            className={itemClass(tab.key)}
            onClick={() => onSelect?.(tab.key)}
          >
            {tab.label}
          </button>
        )
      )}
    </div>
  );
}
