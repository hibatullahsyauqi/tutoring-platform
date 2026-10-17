import { ViewTransition } from 'react';

/**
 * Re-mounts on every navigation. Wrapping the page in a ViewTransition lets the browser animate
 * the old page out and the new one in (see the liquid-page-* rules in globals.css); browsers
 * without view transitions simply switch pages.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="liquid-page-in" exit="liquid-page-out" default="none">
      {children}
    </ViewTransition>
  );
}
