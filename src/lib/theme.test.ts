import { describe, expect, test } from 'bun:test';
import { autoIsDark, parseThemeSetting, resolveIsDark, themeBootstrapScript } from './theme';

// A moment on 17 Oct 2026 at a given local clock time, for a given UTC offset (minutes).
const at = (hour: number, minute: number, offset: number) =>
  Date.UTC(2026, 9, 17, hour, minute) - offset * 60000;
const WIB = 7 * 60;

describe('autoIsDark', () => {
  test('dark before sunrise and after sunset, light between (UTC+7)', () => {
    expect(autoIsDark(at(2, 0, WIB), WIB)).toBe(true);
    expect(autoIsDark(at(5, 0, WIB), WIB)).toBe(true);
    expect(autoIsDark(at(7, 0, WIB), WIB)).toBe(false);
    expect(autoIsDark(at(12, 0, WIB), WIB)).toBe(false);
    expect(autoIsDark(at(17, 0, WIB), WIB)).toBe(false);
    expect(autoIsDark(at(19, 0, WIB), WIB)).toBe(true);
    expect(autoIsDark(at(23, 30, WIB), WIB)).toBe(true);
  });

  test('works the same for any zone, because it follows local clock time', () => {
    for (const offset of [-8 * 60, 0, 5.5 * 60, 9 * 60]) {
      expect(autoIsDark(at(12, 0, offset), offset)).toBe(false);
      expect(autoIsDark(at(1, 0, offset), offset)).toBe(true);
    }
  });

  test('the switch moves a little with the season (equation of time)', () => {
    // Mid-February solar noon is late (~12:14), so 18:10 is still day; early November it is
    // early (~11:44), so 17:50 is already night.
    const feb = Date.UTC(2026, 1, 12, 18, 10) - WIB * 60000;
    const nov = Date.UTC(2026, 10, 3, 17, 50) - WIB * 60000;
    expect(autoIsDark(feb, WIB)).toBe(false);
    expect(autoIsDark(nov, WIB)).toBe(true);
  });
});

describe('resolveIsDark', () => {
  test('manual settings ignore the clock', () => {
    expect(resolveIsDark('dark', at(12, 0, WIB), WIB)).toBe(true);
    expect(resolveIsDark('light', at(2, 0, WIB), WIB)).toBe(false);
  });

  test('auto follows the clock', () => {
    expect(resolveIsDark('auto', at(2, 0, WIB), WIB)).toBe(true);
    expect(resolveIsDark('auto', at(12, 0, WIB), WIB)).toBe(false);
  });
});

describe('parseThemeSetting', () => {
  test('only light and dark are accepted, anything else is auto', () => {
    expect(parseThemeSetting('dark')).toBe('dark');
    expect(parseThemeSetting('light')).toBe('light');
    expect(parseThemeSetting('purple')).toBe('auto');
    expect(parseThemeSetting(null)).toBe('auto');
  });
});

describe('themeBootstrapScript', () => {
  test('is valid, self-contained JavaScript that sets data-theme', () => {
    const set: Record<string, string> = {};
    const fakeDocument = { documentElement: { dataset: set } };
    const fakeStorage = { getItem: () => null };
    new Function('document', 'localStorage', themeBootstrapScript)(fakeDocument, fakeStorage);
    expect(['light', 'dark']).toContain(set.theme);
  });

  test('a stored dark setting wins', () => {
    const set: Record<string, string> = {};
    new Function('document', 'localStorage', themeBootstrapScript)(
      { documentElement: { dataset: set } },
      { getItem: () => 'dark' }
    );
    expect(set.theme).toBe('dark');
  });
});
