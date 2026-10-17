'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTimeZone } from '@/components/TimeZoneProvider';
import { addDaysToKey, formatDateOnly, mondayKey } from '@/lib/time';

const GAP = 6;
const EDGE = 12;
const WIDTH = 304;
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const DEFAULT_TIME = '18:30';

type Placement = { top: number; left: number; above: boolean };

const pad = (n: number) => String(n).padStart(2, '0');
const monthOf = (dayKey: string) => dayKey.slice(0, 7); // YYYY-MM
const firstOf = (monthKey: string) => `${monthKey}-01`;

function addMonths(monthKey: string, n: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** 6 weeks (42 days) starting on the Monday on or before the 1st. */
function gridFor(monthKey: string): string[] {
  const start = mondayKey(firstOf(monthKey));
  return Array.from({ length: 42 }, (_, i) => addDaysToKey(start, i));
}

function splitValue(value: string): { date: string | null; time: string } {
  const [date, time] = value.split('T');
  return { date: /^\d{4}-\d{2}-\d{2}$/.test(date ?? '') ? date : null, time: /^\d{2}:\d{2}$/.test(time ?? '') ? time : DEFAULT_TIME };
}

function dayDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const HOLD_DELAY_MS = 420;
const HOLD_REPEAT_MS = 85;

function Chevron({ up }: { up: boolean }) {
  return (
    <svg
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
      <polyline points={up ? '6 15 12 9 18 15' : '6 9 12 15 18 9'} />
    </svg>
  );
}

/**
 * Hour or minute control: glass buttons above and below a glass pill. Digits roll up or down as
 * the value changes, and holding a button keeps stepping. The value also answers the arrow keys.
 */
function Stepper({
  label,
  value,
  onStep,
}: {
  label: string;
  value: string;
  onStep: (delta: number) => void;
}) {
  const [direction, setDirection] = useState<1 | -1>(1);
  const hold = useRef<{ delay: ReturnType<typeof setTimeout> | null; repeat: ReturnType<typeof setInterval> | null }>({
    delay: null,
    repeat: null,
  });

  const stop = () => {
    if (hold.current.delay) clearTimeout(hold.current.delay);
    if (hold.current.repeat) clearInterval(hold.current.repeat);
    hold.current = { delay: null, repeat: null };
  };
  useEffect(() => stop, []);

  const step = (delta: 1 | -1) => {
    setDirection(delta);
    onStep(delta);
  };
  const start = (delta: 1 | -1) => {
    step(delta);
    stop();
    hold.current.delay = setTimeout(() => {
      hold.current.repeat = setInterval(() => step(delta), HOLD_REPEAT_MS);
    }, HOLD_DELAY_MS);
  };

  return (
    <div className="glass-date-stepper" role="group" aria-label={label}>
      <button
        type="button"
        className="glass-btn glass-step"
        aria-label={`Increase ${label}`}
        onPointerDown={(e) => {
          e.preventDefault();
          start(1);
        }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            step(1);
          }
        }}
      >
        <Chevron up />
      </button>
      <span
        className="glass-inset glass-date-time"
        role="spinbutton"
        tabIndex={0}
        aria-label={label}
        aria-valuenow={Number(value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            step(1);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            step(-1);
          }
        }}
      >
        <span key={value} className={direction === 1 ? 'digit-up' : 'digit-down'}>
          {value}
        </span>
      </span>
      <button
        type="button"
        className="glass-btn glass-step"
        aria-label={`Decrease ${label}`}
        onPointerDown={(e) => {
          e.preventDefault();
          start(-1);
        }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            step(-1);
          }
        }}
      >
        <Chevron up={false} />
      </button>
    </div>
  );
}

/**
 * A date (or date and time) picker in the glass style, replacing the browser's own. Values are
 * plain strings: "YYYY-MM-DD", or "YYYY-MM-DDTHH:mm" in datetime mode, read in the tutor's time
 * zone like everything else. Arrow keys move between days, PageUp/PageDown change month.
 */
export default function GlassDatePicker({
  value,
  onChange,
  mode = 'date',
  min,
  max,
  className = '',
  ariaLabel,
  placeholder = 'Pick a date',
}: {
  value: string;
  onChange: (value: string) => void;
  mode?: 'date' | 'datetime';
  min?: string;
  max?: string;
  className?: string;
  ariaLabel?: string;
  placeholder?: string;
}) {
  const id = useId();
  const zone = useTimeZone();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const withTime = mode === 'datetime';

  const { date: valueDate, time: valueTime } = splitValue(value);
  const today = zone.dateKey(new Date());
  const minDate = min?.slice(0, 10);
  const maxDate = max?.slice(0, 10);

  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [place, setPlace] = useState<Placement | null>(null);
  const [view, setView] = useState(() => monthOf(valueDate ?? today));
  const [cursor, setCursor] = useState(valueDate ?? today);
  const [direction, setDirection] = useState<'next' | 'prev' | 'none'>('none');

  const disabledDay = useCallback(
    (key: string) => (minDate !== undefined && key < minDate) || (maxDate !== undefined && key > maxDate),
    [minDate, maxDate]
  );

  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const height = popRef.current?.offsetHeight ?? 380;
    const below = window.innerHeight - rect.bottom - GAP - EDGE;
    const above = rect.top - GAP - EDGE;
    const flip = below < height && above > below;
    setPlace({
      top: flip ? rect.top - GAP : rect.bottom + GAP,
      left: Math.min(Math.max(EDGE, rect.left), Math.max(EDGE, window.innerWidth - WIDTH - EDGE)),
      above: flip,
    });
  }, []);

  const openPicker = () => {
    const start = valueDate ?? (maxDate && today > maxDate ? maxDate : minDate && today < minDate ? minDate : today);
    setView(monthOf(start));
    setCursor(start);
    setDirection('none');
    setRendered(true);
    setOpen(true);
  };
  const closePicker = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (rendered) measure();
  }, [rendered, open, measure]);

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const onMove = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!popRef.current?.contains(target) && !triggerRef.current?.contains(target)) closePicker();
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
  }, [open, measure, closePicker]);

  // Move keyboard focus onto the highlighted day whenever it changes.
  useEffect(() => {
    if (!open) return;
    popRef.current?.querySelector<HTMLElement>(`[data-day="${cursor}"]`)?.focus({ preventScroll: true });
  }, [cursor, open, view]);

  const clampToRange = (next: string): string => {
    if (min && next < min) return min;
    if (max && next > max) return max;
    return next;
  };
  const emit = (date: string, time: string) => {
    const next = withTime ? clampToRange(`${date}T${time}`) : date;
    onChange(next);
  };

  const pickDay = (key: string) => {
    if (disabledDay(key)) return;
    emit(key, valueTime);
    if (!withTime) closePicker(true);
  };

  const goMonth = (delta: number) => {
    setDirection(delta > 0 ? 'next' : 'prev');
    setView((v) => addMonths(v, delta));
    setCursor((c) => {
      const moved = addMonths(monthOf(c), delta);
      return `${moved}-${c.slice(8, 10)}` > `${moved}-28` ? `${moved}-28` : `${moved}-${c.slice(8, 10)}`;
    });
  };

  const moveCursor = (days: number) => {
    const next = addDaysToKey(cursor, days);
    if (monthOf(next) !== view) {
      setDirection(next > cursor ? 'next' : 'prev');
      setView(monthOf(next));
    }
    setCursor(next);
  };

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        moveCursor(-1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveCursor(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveCursor(-7);
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveCursor(7);
        break;
      case 'PageUp':
        e.preventDefault();
        goMonth(-1);
        break;
      case 'PageDown':
        e.preventDefault();
        goMonth(1);
        break;
    }
  };

  const stepTime = (part: 'h' | 'm', delta: number) => {
    const [h, m] = valueTime.split(':').map(Number);
    const total = (h * 60 + m + (part === 'h' ? delta * 60 : delta * 5) + 1440) % 1440;
    emit(valueDate ?? cursor, `${pad(Math.floor(total / 60))}:${pad(total % 60)}`);
  };
  // A held button keeps firing the handler it started with, so route it to the latest one.
  const stepRef = useRef(stepTime);
  useEffect(() => {
    stepRef.current = stepTime;
  });

  const label = valueDate
    ? `${formatDateOnly(dayDate(valueDate), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}${
        withTime ? ` · ${valueTime}` : ''
      }`
    : placeholder;

  const cells = gridFor(view);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-pop`}
        aria-label={ariaLabel}
        className={`glass-input glass-select-trigger w-full text-left ${open ? 'is-open' : ''} ${className}`}
        onClick={() => (open ? closePicker() : openPicker())}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            openPicker();
          }
        }}
      >
        <span className={`glass-select-value ${valueDate ? '' : 'opacity-60'}`}>{label}</span>
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
          className="shrink-0 opacity-70"
        >
          <rect x="3" y="4" width="18" height="18" rx="3" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>

      {rendered &&
        place &&
        createPortal(
          <div
            ref={popRef}
            id={`${id}-pop`}
            role="dialog"
            aria-label={ariaLabel ?? 'Choose a date'}
            className={`glass-select-pop glass-date-pop ${place.above ? 'is-above' : ''} ${open ? '' : 'is-closing'}`}
            style={{
              top: place.above ? undefined : place.top,
              bottom: place.above ? window.innerHeight - place.top : undefined,
              left: place.left,
              width: WIDTH,
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                closePicker(true);
              }
            }}
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget && !open) setRendered(false);
            }}
          >
            <div className="glass-date-head">
              <button type="button" className="glass-date-nav" aria-label="Previous month" onClick={() => goMonth(-1)}>
                ‹
              </button>
              <span className="glass-date-title" aria-live="polite">
                {formatDateOnly(dayDate(firstOf(view)), { month: 'long', year: 'numeric' })}
              </span>
              <button type="button" className="glass-date-nav" aria-label="Next month" onClick={() => goMonth(1)}>
                ›
              </button>
            </div>

            <div className="glass-date-weekdays" aria-hidden="true">
              {WEEKDAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>

            <div
              key={view}
              role="grid"
              className={`glass-date-grid ${direction === 'next' ? 'week-slide-next' : direction === 'prev' ? 'week-slide-prev' : ''}`}
              onKeyDown={onGridKeyDown}
            >
              {cells.map((key) => {
                const outside = monthOf(key) !== view;
                const selected = key === valueDate;
                const disabled = disabledDay(key);
                return (
                  <button
                    key={key}
                    type="button"
                    role="gridcell"
                    data-day={key}
                    tabIndex={key === cursor ? 0 : -1}
                    disabled={disabled}
                    aria-selected={selected}
                    aria-label={formatDateOnly(dayDate(key), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    className={`glass-date-day ${outside ? 'is-outside' : ''} ${selected ? 'is-selected' : ''} ${
                      key === today ? 'is-today' : ''
                    }`}
                    onClick={() => pickDay(key)}
                  >
                    {Number(key.slice(8, 10))}
                  </button>
                );
              })}
            </div>

            {withTime && (
              <div className="glass-date-timebar">
                <Stepper label="hour" value={valueTime.slice(0, 2)} onStep={(d) => stepRef.current('h', d)} />
                <span className="glass-date-colon">:</span>
                <Stepper label="minute" value={valueTime.slice(3)} onStep={(d) => stepRef.current('m', d)} />
                <div className="glass-date-quick">
                  <button
                    type="button"
                    className="glass-btn glass-btn-sm"
                    onClick={() => emit(valueDate ?? cursor, DEFAULT_TIME)}
                  >
                    18:30
                  </button>
                </div>
              </div>
            )}

            <div className="glass-date-foot">
              <button
                type="button"
                className="glass-btn glass-btn-sm"
                disabled={disabledDay(today)}
                onClick={() => {
                  setDirection('none');
                  setView(monthOf(today));
                  setCursor(today);
                  if (!withTime) pickDay(today);
                  else emit(today, valueTime);
                }}
              >
                Today
              </button>
              {withTime && (
                <button type="button" className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => closePicker(true)}>
                  Done
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
