export type ThemeSetting = 'auto' | 'light' | 'dark';
export const THEME_STORAGE_KEY = 'theme';

/**
 * Whether it is night, from the clock alone: no location lookup. The UTC offset stands in for
 * longitude (the middle of the time zone), the equation of time shifts solar noon through the
 * year, and the day is taken as 12 hours long, which is right near the equator and a rough
 * guide elsewhere.
 *
 * Self-contained on purpose: layout.tsx inlines this function's source into a script that runs
 * before the page paints, so it must not reference anything outside itself.
 */
export function autoIsDark(nowMs: number, offsetMinutes: number): boolean {
  const local = new Date(nowMs + offsetMinutes * 60000);
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  const dayOfYear = Math.floor(
    (Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
      Date.UTC(local.getUTCFullYear(), 0, 0)) /
      86400000
  );
  const b = (2 * Math.PI * (dayOfYear - 81)) / 364;
  const equationOfTime = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b); // minutes
  const solarNoon = 720 - equationOfTime;
  return minutes < solarNoon - 360 || minutes >= solarNoon + 360;
}

export function resolveIsDark(setting: ThemeSetting, nowMs: number, offsetMinutes: number): boolean {
  if (setting === 'dark') return true;
  if (setting === 'light') return false;
  return autoIsDark(nowMs, offsetMinutes);
}

export function parseThemeSetting(value: string | null | undefined): ThemeSetting {
  return value === 'light' || value === 'dark' ? value : 'auto';
}

/** Runs in <head> before first paint so the page never flashes the wrong theme. */
export const themeBootstrapScript = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');if(s!=='light'&&s!=='dark')s='auto';var f=${autoIsDark.toString()};var dark=s==='dark'||(s==='auto'&&f(Date.now(),-new Date().getTimezoneOffset()));document.documentElement.dataset.theme=dark?'dark':'light';}catch(e){}})();`;
