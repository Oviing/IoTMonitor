/**
 * Theme hook — resolves light/dark, reflects the choice onto
 * `document.documentElement[data-theme]` (so CSS custom properties switch), and
 * persists it to localStorage. Defaults to the OS preference on first load.
 */
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'iotmonitor.theme';

function initialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* ignore unavailable storage */
  }
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true;
  return prefersDark ? 'dark' : 'light';
}

/** @returns {[('light'|'dark'), () => void]} current theme + toggle */
export function useTheme() {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  return [theme, toggle];
}
