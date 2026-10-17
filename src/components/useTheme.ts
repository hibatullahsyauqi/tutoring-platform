'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { parseThemeSetting, resolveIsDark, THEME_STORAGE_KEY, type ThemeSetting } from '@/lib/theme';

const ORDER: ThemeSetting[] = ['auto', 'light', 'dark'];

export const THEME_LABEL: Record<ThemeSetting, string> = {
  auto: 'Auto',
  light: 'Light',
  dark: 'Dark',
};

function readSetting(): ThemeSetting {
  try {
    return parseThemeSetting(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'auto';
  }
}

function applyTheme(setting: ThemeSetting) {
  const dark = resolveIsDark(setting, Date.now(), -new Date().getTimezoneOffset());
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

const listeners = new Set<() => void>();
function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener('storage', callback); // another tab changed it
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', callback);
  };
}

/**
 * The saved display setting, plus a function that cycles Auto → Light → Dark. Mount it somewhere
 * that is always on screen: it also keeps Auto in step with the clock (re-checked every minute).
 */
export function useTheme() {
  // The server always renders "auto"; the browser's saved choice takes over right after hydration.
  const setting = useSyncExternalStore(subscribe, readSetting, () => 'auto' as ThemeSetting);

  useEffect(() => {
    applyTheme(setting);
    if (setting !== 'auto') return;
    const id = setInterval(() => applyTheme('auto'), 60_000);
    return () => clearInterval(id);
  }, [setting]);

  const cycle = useCallback(() => {
    const following = ORDER[(ORDER.indexOf(setting) + 1) % ORDER.length];
    try {
      localStorage.setItem(THEME_STORAGE_KEY, following);
    } catch {
      // Private mode: the choice just lasts until the tab closes.
    }
    listeners.forEach((l) => l());
    applyTheme(following);
  }, [setting]);

  return { setting, cycle };
}
