'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { signOutAction } from '@/app/actions/auth';
import { listPaletteStudentsAction, type PaletteStudent } from '@/app/actions/palette';
import { useTheme } from '@/components/useTheme';
import { filterItems, type PaletteItem } from '@/lib/palette';

export const OPEN_PALETTE_EVENT = 'open-command-palette';

type Command = PaletteItem & { icon: string; run: () => void };

const EXIT_MS = 300;
const STUDENT_CACHE_MS = 60_000;

/**
 * Quick jump: Ctrl/⌘ + K (or "/") opens a search over pages, students and a few actions, so any
 * place in the app is a few keystrokes away. Students are fetched once when it first opens.
 */
export default function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const { cycle } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const studentsFetchedAt = useRef(0);

  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [students, setStudents] = useState<PaletteStudent[] | null>(null);

  const onAuthScreen = pathname === '/login' || pathname.startsWith('/auth');
  // Only shown once the palette is open, i.e. in the browser, so it cannot mismatch the server.
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  const openPalette = () => {
    setQuery('');
    setActive(0);
    setRendered(true);
    setOpen(true);
    if (Date.now() - studentsFetchedAt.current > STUDENT_CACHE_MS) {
      studentsFetchedAt.current = Date.now();
      listPaletteStudentsAction()
        .then(setStudents)
        .catch(() => {
          studentsFetchedAt.current = 0;
          setStudents([]);
        });
    }
  };
  const closePalette = () => setOpen(false);

  // Hotkeys, and a custom event so other buttons (the settings menu) can open it.
  useEffect(() => {
    if (onAuthScreen) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) closePalette();
        else openPalette();
      } else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey && !open) {
        e.preventDefault();
        openPalette();
      }
    };
    const onOpen = () => openPalette();
    document.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
    // openPalette only touches refs and setters, so it is safe to leave out.
  }, [open, onAuthScreen]);

  // Remove it from the page once the exit animation has played.
  useEffect(() => {
    if (open || !rendered) return;
    const id = setTimeout(() => setRendered(false), EXIT_MS);
    return () => clearTimeout(id);
  }, [open, rendered]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, rendered]);

  const go = (href: string) => () => {
    closePalette();
    router.push(href);
  };

  const commands: Command[] = useMemo(
    () => [
      { id: 'dash', icon: '🏠', label: 'Dashboard', group: 'Go to', keywords: 'home overview command center', run: go('/') },
      { id: 'sched', icon: '📅', label: 'Schedule', group: 'Go to', keywords: 'calendar timetable week book', run: go('/schedule') },
      { id: 'lib', icon: '📚', label: 'Library', group: 'Go to', keywords: 'resources past papers books', run: go('/library') },
      { id: 'log', icon: '✍️', label: 'Log session', group: 'Go to', keywords: 'record lesson new', run: go('/sessions/new') },
      { id: 'new', icon: '➕', label: 'Add student', group: 'Go to', keywords: 'new onboard pupil', run: go('/students/new') },
      ...(students ?? []).map<Command>((s) => ({
        id: `student-${s.id}`,
        icon: '🎓',
        label: s.name,
        hint: s.course,
        group: 'Students',
        run: go(`/students/${s.id}`),
      })),
      {
        id: 'theme',
        icon: '🌗',
        label: 'Change display mode',
        hint: 'Auto, light or dark',
        group: 'Actions',
        keywords: 'theme dark light',
        run: () => {
          closePalette();
          cycle({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
        },
      },
      {
        id: 'refresh',
        icon: '↻',
        label: 'Refresh this page',
        group: 'Actions',
        keywords: 'reload update',
        run: () => {
          closePalette();
          router.refresh();
        },
      },
      {
        id: 'signout',
        icon: '🚪',
        label: 'Sign out',
        group: 'Actions',
        keywords: 'log out logout',
        run: () => {
          closePalette();
          void signOutAction();
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [students, cycle]
  );

  const results = useMemo(() => filterItems(commands, query) as Command[], [commands, query]);
  const clamped = Math.min(active, Math.max(0, results.length - 1));

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${clamped}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [clamped, results.length]);

  if (onAuthScreen || !rendered) return null;

  return createPortal(
    <div
      className={`modal-backdrop fixed inset-0 z-[85] flex items-start justify-center bg-black/40 p-4 pt-[14vh] backdrop-blur-xs ${
        open ? '' : 'modal-closing'
      }`}
      onClick={closePalette}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick jump"
        className={`${open ? 'liquid-pop' : 'liquid-pop-out'} glass-panel w-full max-w-lg overflow-hidden p-3`}
        style={{ transformOrigin: 'top center' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            closePalette();
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive(Math.min(results.length - 1, clamped + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive(Math.max(0, clamped - 1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            results[clamped]?.run();
          }
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          placeholder="Jump to a page, a student or an action…"
          aria-label="Search"
          autoComplete="off"
          spellCheck={false}
          className="glass-input w-full p-3 text-sm font-medium"
        />

        <div ref={listRef} className="mt-2 max-h-[22rem] overflow-y-auto pr-0.5" role="listbox">
          {results.length === 0 && (
            <p className="px-3 py-6 text-center text-xs font-medium text-slate-700">
              {students === null && query ? 'Loading students…' : `Nothing matches "${query}".`}
            </p>
          )}
          {results.map((item, i) => {
            const showGroup = i === 0 || results[i - 1].group !== item.group;
            return (
              <div key={item.id}>
                {showGroup && <div className="glass-select-group">{item.group}</div>}
                <div
                  role="option"
                  aria-selected={i === clamped}
                  data-i={i}
                  className={`glass-select-option ${i === clamped ? 'is-active' : ''}`}
                  style={{ ['--i' as string]: Math.min(i, 10) }}
                  onPointerMove={() => i !== clamped && setActive(i)}
                  onClick={() => item.run()}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span aria-hidden="true" className="w-5 shrink-0 text-center">
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.hint && <span className="truncate text-[11px] font-medium text-slate-600">{item.hint}</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-black/10 px-2 pt-2 text-[11px] font-medium text-slate-600">
          <span>↑↓ move · ↵ open · esc close</span>
          <span>{isMac ? '⌘' : 'Ctrl'} K</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
