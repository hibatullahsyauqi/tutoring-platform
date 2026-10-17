'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type GlassOption = { value: string; label: string; group?: string };

type Placement = { top: number; left: number; width: number; maxHeight: number; above: boolean };

const GAP = 6;
const MAX_LIST_HEIGHT = 320;
const EDGE = 12;

/**
 * A dropdown that matches the glass UI (the browser's own <select> list can't be styled). Opens
 * a frosted list with a liquid swell, supports groups, keyboard control (arrows, Home/End,
 * Enter, Escape, type to jump) and flips upward when there is no room below.
 */
export default function GlassSelect({
  value,
  onChange,
  options,
  className = '',
  variant = 'field',
  ariaLabel,
  disabled = false,
  placeholder = 'Select…',
}: {
  value: string;
  onChange: (value: string) => void;
  options: GlassOption[];
  className?: string;
  /** "field" looks like a text field; "inline" is a quiet text-only trigger for toolbars. */
  variant?: 'field' | 'inline';
  ariaLabel?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: '', timer: null as ReturnType<typeof setTimeout> | null });

  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<Placement | null>(null);

  const selected = options.find((o) => o.value === value);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));

  // Options in display order with a heading wherever the group changes.
  const rows = useMemo(() => {
    const out: ({ kind: 'group'; label: string } | { kind: 'option'; option: GlassOption; index: number })[] = [];
    let lastGroup: string | undefined;
    options.forEach((option, index) => {
      if (option.group && option.group !== lastGroup) out.push({ kind: 'group', label: option.group });
      lastGroup = option.group;
      out.push({ kind: 'option', option, index });
    });
    return out;
  }, [options]);

  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - GAP - EDGE;
    const above = rect.top - GAP - EDGE;
    const wanted = Math.min(MAX_LIST_HEIGHT, (listRef.current?.scrollHeight ?? MAX_LIST_HEIGHT) + 12);
    const flip = below < Math.min(wanted, 200) && above > below;
    const room = Math.max(120, flip ? above : below);
    const width = Math.max(rect.width, 190);
    setPlace({
      top: flip ? rect.top - GAP : rect.bottom + GAP,
      left: Math.min(Math.max(EDGE, rect.left), window.innerWidth - width - EDGE),
      width,
      maxHeight: Math.min(MAX_LIST_HEIGHT, room),
      above: flip,
    });
  }, []);

  const openList = () => {
    if (disabled) return;
    setActive(selectedIndex);
    setRendered(true);
    setOpen(true);
  };
  const closeList = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);
  const choose = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    closeList(true);
  };

  // Place the list as soon as it exists, and keep it attached while the page scrolls or resizes.
  useLayoutEffect(() => {
    if (!rendered) return;
    measure();
  }, [rendered, open, measure, options.length]);

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const onMove = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!listRef.current?.contains(target) && !triggerRef.current?.contains(target)) closeList();
    };
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
      document.removeEventListener('pointerdown', onDown);
      cancelAnimationFrame(frame);
    };
  }, [open, measure, closeList]);

  // Keep the highlighted option in view.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const jumpTo = (text: string) => {
    const lower = text.toLowerCase();
    const from = typed.current.text.length > 1 ? active : active + 1;
    for (let i = 0; i < options.length; i += 1) {
      const idx = (from + i) % options.length;
      if (options[idx].label.toLowerCase().startsWith(lower)) {
        setActive(idx);
        return;
      }
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((a) => Math.min(options.length - 1, a + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(active);
        break;
      case 'Escape':
        e.preventDefault();
        closeList(true);
        break;
      case 'Tab':
        closeList();
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const state = typed.current;
          if (state.timer) clearTimeout(state.timer);
          state.text += e.key;
          jumpTo(state.text);
          state.timer = setTimeout(() => {
            state.text = '';
          }, 600);
        }
    }
  };

  const triggerClass =
    variant === 'inline'
      ? 'glass-select-inline'
      : 'glass-input glass-select-trigger w-full text-left';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={ariaLabel}
        disabled={disabled}
        className={`${triggerClass} ${open ? 'is-open' : ''} ${className}`}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={onKeyDown}
      >
        <span className="glass-select-value">{selected?.label ?? placeholder}</span>
        <svg
          className="glass-select-chevron"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {rendered &&
        place &&
        createPortal(
          <div
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            aria-label={ariaLabel}
            className={`glass-select-pop ${place.above ? 'is-above' : ''} ${open ? '' : 'is-closing'}`}
            style={{
              top: place.above ? undefined : place.top,
              bottom: place.above ? window.innerHeight - place.top : undefined,
              left: place.left,
              width: place.width,
              maxHeight: place.maxHeight,
            }}
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget && !open) setRendered(false);
            }}
          >
            {rows.map((row, i) =>
              row.kind === 'group' ? (
                <div key={`g-${row.label}-${i}`} className="glass-select-group" role="presentation">
                  {row.label}
                </div>
              ) : (
                <div
                  key={row.option.value}
                  role="option"
                  data-index={row.index}
                  aria-selected={row.option.value === value}
                  className={`glass-select-option ${row.index === active ? 'is-active' : ''} ${
                    row.option.value === value ? 'is-selected' : ''
                  }`}
                  style={{ ['--i' as string]: Math.min(row.index, 12) }}
                  onPointerMove={() => row.index !== active && setActive(row.index)}
                  onClick={() => choose(row.index)}
                >
                  <span className="truncate">{row.option.label}</span>
                  {row.option.value === value && (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              )
            )}
          </div>,
          document.body
        )}
    </>
  );
}
