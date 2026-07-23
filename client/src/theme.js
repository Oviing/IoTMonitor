/**
 * Theme helper — light/dark with an explicit toggle that persists to
 * localStorage and falls back to the OS preference.
 *
 * The chosen theme is written as a `data-theme` attribute on
 * <html> (document.documentElement); styles.css redefines its color tokens
 * under `:root[data-theme="light"|"dark"]` so the toggle wins over the
 * `prefers-color-scheme` media query in both directions.
 */

const STORAGE_KEY = 'iotmonitor-theme';

/** @returns {'light'|'dark'} the initial theme (stored choice, else OS preference). */
export function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* localStorage may be unavailable (private mode) — fall through */
  }
  const prefersDark =
    typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

/** Apply a theme to the document root. @param {'light'|'dark'} theme */
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Persist + apply a theme.
 * @param {'light'|'dark'} theme
 */
export function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore persistence failures */
  }
  applyTheme(theme);
}
