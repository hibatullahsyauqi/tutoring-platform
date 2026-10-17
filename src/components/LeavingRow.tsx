'use client';

import { createContext, useContext, useMemo, useState } from 'react';

type RowApi = { setLeaving: (leaving: boolean) => void };

const RowContext = createContext<RowApi | null>(null);

/** Lets a button inside a row start the row's exit animation (and undo it if the action fails). */
export function useLeavingRow(): RowApi | null {
  return useContext(RowContext);
}

/**
 * A list row or card that melts away the moment its action starts (archive, restore), instead of
 * waiting for the page to refresh and then vanishing. `index` staggers the entrance.
 */
export default function LeavingRow({
  className = '',
  index = 0,
  children,
}: {
  className?: string;
  index?: number;
  children: React.ReactNode;
}) {
  const [leaving, setLeaving] = useState(false);
  const api = useMemo(() => ({ setLeaving }), []);

  return (
    <RowContext.Provider value={api}>
      <div
        className={`${leaving ? 'row-leaving' : 'row-entering'} ${className}`}
        style={{ ['--i' as string]: Math.min(index, 8) }}
      >
        {children}
      </div>
    </RowContext.Provider>
  );
}
