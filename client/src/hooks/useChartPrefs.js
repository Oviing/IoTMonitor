/**
 * Chart-preference hook — the "both" selection model:
 *   • one global default chart type (applies to every card set to 'auto'), and
 *   • per-signal overrides keyed by the composite `${connId}::${id}` key.
 * Both are persisted to localStorage so the operator's chosen layout survives a
 * reload.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'iotmonitor.chartPrefs';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        globalDefault: parsed.globalDefault || 'auto',
        overrides: parsed.overrides && typeof parsed.overrides === 'object' ? parsed.overrides : {},
      };
    }
  } catch {
    /* ignore malformed / unavailable storage */
  }
  return { globalDefault: 'auto', overrides: {} };
}

export function useChartPrefs() {
  const [prefs, setPrefs] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const setGlobalDefault = useCallback(
    (type) => setPrefs((p) => ({ ...p, globalDefault: type })),
    []
  );

  const setOverride = useCallback((key, type) => {
    setPrefs((p) => {
      const overrides = { ...p.overrides };
      // 'auto' means "follow the global default" — clear any explicit override.
      if (!type || type === 'auto') delete overrides[key];
      else overrides[key] = type;
      return { ...p, overrides };
    });
  }, []);

  return useMemo(
    () => ({
      globalDefault: prefs.globalDefault,
      overrides: prefs.overrides,
      /** The stored preference for a key, falling back to the global default. */
      prefFor: (key) => prefs.overrides[key] ?? prefs.globalDefault,
      /** True when a key carries its own explicit override. */
      hasOverride: (key) => key in prefs.overrides,
      setGlobalDefault,
      setOverride,
    }),
    [prefs, setGlobalDefault, setOverride]
  );
}
