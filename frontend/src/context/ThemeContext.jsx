import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { THEMES, DEFAULT_THEME } from '../theme/themes.js';

const STORAGE_KEY = 'rk_theme';

function themeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

function applyTheme(t) {
  const root = document.documentElement;
  root.style.setProperty('--color-aqua-100', t.aqua100);
  root.style.setProperty('--color-aqua-200', `color-mix(in srgb, ${t.aqua300} 75%, ${t.aqua100})`);
  root.style.setProperty('--color-aqua-300', t.aqua300);
  root.style.setProperty('--color-aqua-400', t.aqua400);
  root.style.setProperty('--color-deep-950', t.deep950);
  root.style.setProperty('--color-deep-900', t.deep900);
  root.style.setProperty('--color-deep-800', t.deep800);
  root.style.setProperty('--color-deep-700', t.deep700);
  root.style.setProperty('--color-deep-600', t.deep600);
}

function storedThemeId() {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    return themeById(id) ? id : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(storedThemeId);

  useEffect(() => {
    applyTheme(themeById(themeId));
    try {
      localStorage.setItem(STORAGE_KEY, themeId);
    } catch {
      /* private mode — theme still applies for this session */
    }
  }, [themeId]);

  const setTheme = useCallback((id) => setThemeId(themeById(id).id), []);
  const cycle = useCallback(() => {
    setThemeId((prev) => {
      const i = THEMES.findIndex((t) => t.id === prev);
      return THEMES[(i + 1) % THEMES.length].id;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: themeById(themeId), themes: THEMES, setTheme, cycle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
