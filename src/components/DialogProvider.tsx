'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Tone = 'default' | 'danger';

type Request = {
  kind: 'confirm' | 'notify';
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: Tone;
  resolve: (confirmed: boolean) => void;
};

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
};

type NotifyOptions = { title?: string; message: string; tone?: 'error' | 'info' };

type DialogApi = {
  /** Resolves true when the tutor confirms, false when they cancel, press Escape or click away. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** A message with a single OK button, in place of the browser's alert(). */
  notify: (options: NotifyOptions) => Promise<void>;
};

const DialogContext = createContext<DialogApi | null>(null);

/** How long the exit animation runs before the next dialog (if any) is shown. */
const EXIT_MS = 340;

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<Request[]>([]);
  const [closing, setClosing] = useState(false);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const current = queue[0] ?? null;

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setQueue((q) => [
          ...q,
          {
            kind: 'confirm',
            title: options.title,
            message: options.message ?? '',
            confirmLabel: options.confirmLabel ?? 'Confirm',
            cancelLabel: options.cancelLabel ?? 'Cancel',
            tone: options.tone ?? 'default',
            resolve,
          },
        ]);
      }),
    []
  );

  const notify = useCallback(
    (options: NotifyOptions) =>
      new Promise<void>((resolve) => {
        setQueue((q) => [
          ...q,
          {
            kind: 'notify',
            title: options.title ?? (options.tone === 'info' ? 'Heads up' : 'Something went wrong'),
            message: options.message,
            confirmLabel: 'OK',
            cancelLabel: '',
            tone: options.tone === 'info' ? 'default' : 'danger',
            resolve: () => resolve(),
          },
        ]);
      }),
    []
  );

  const settle = useCallback(
    (value: boolean) => {
      if (!current || closing) return;
      current.resolve(value);
      setClosing(true);
    },
    [current, closing]
  );

  // Once the exit animation has had time to play, move on to the next dialog.
  useEffect(() => {
    if (!closing) return;
    const id = setTimeout(() => {
      setQueue((q) => q.slice(1));
      setClosing(false);
    }, EXIT_MS);
    return () => clearTimeout(id);
  }, [closing]);

  // Keyboard: Escape cancels, Tab stays inside the dialog. A destructive confirm starts on
  // Cancel so Enter can't delete by accident.
  useEffect(() => {
    if (!current || closing) return;
    const start = current.kind === 'confirm' && current.tone === 'danger' ? cancelRef.current : primaryRef.current;
    start?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        settle(current.kind === 'notify');
      } else if (e.key === 'Tab') {
        const buttons = [cancelRef.current, primaryRef.current].filter(Boolean) as HTMLButtonElement[];
        if (buttons.length === 0) return;
        const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.shiftKey ? (at <= 0 ? buttons.length - 1 : at - 1) : at === buttons.length - 1 ? 0 : at + 1;
        e.preventDefault();
        buttons[next].focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [current, closing, settle]);

  const api = useMemo(() => ({ confirm, notify }), [confirm, notify]);
  const danger = current?.tone === 'danger';

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current &&
        createPortal(
          <div
            className={`modal-backdrop fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-[80] ${
              closing ? 'modal-closing' : ''
            }`}
            onClick={() => settle(current.kind === 'notify')}
          >
            <div
              role={current.kind === 'confirm' ? 'alertdialog' : 'dialog'}
              aria-modal="true"
              aria-labelledby="dialog-title"
              aria-describedby="dialog-message"
              className={`${closing ? 'liquid-pop-out' : 'liquid-pop'} glass-panel w-full max-w-sm p-6 space-y-4 text-left`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-extrabold ${
                    danger ? 'bg-red-500/15 text-[#a3462f]' : 'bg-emerald-600/15 text-[#2d523e]'
                  }`}
                >
                  {danger ? '!' : 'i'}
                </span>
                <div className="min-w-0">
                  <h2 id="dialog-title" className="text-base font-bold text-[#0f172a]">
                    {current.title}
                  </h2>
                  {current.message && (
                    <p id="dialog-message" className="mt-1 text-xs font-medium leading-relaxed text-slate-700 whitespace-pre-line">
                      {current.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                {current.kind === 'confirm' && (
                  <button ref={cancelRef} type="button" className="glass-btn" onClick={() => settle(false)}>
                    {current.cancelLabel}
                  </button>
                )}
                <button
                  ref={primaryRef}
                  type="button"
                  className={`glass-btn ${danger && current.kind === 'confirm' ? 'glass-btn-danger-solid' : 'glass-btn-primary'}`}
                  onClick={() => settle(true)}
                >
                  {current.confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </DialogContext.Provider>
  );
}

/** Splits "Do the thing? Details…" into a title (the question) and the rest. */
export function splitQuestion(message: string, fallbackTitle: string): { title: string; body: string } {
  const at = message.indexOf('?');
  if (at > 0 && at < 120) return { title: message.slice(0, at + 1), body: message.slice(at + 1).trim() };
  return { title: fallbackTitle, body: message };
}

export function useDialog(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) throw new Error('useDialog must be used inside <DialogProvider>.');
  return api;
}
