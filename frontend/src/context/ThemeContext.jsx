import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { THEMES, DEFAULT_THEME } from '../theme/themes.js';

// ── Standardized appearance system ─────────────────────────────────────────
// One source of truth for how the app looks. Theme colors and wallpapers are
// mutually exclusive: picking a wallpaper switches to wallpaper mode (the
// theme palette is not applied), picking a theme switches back (wallpaper is
// turned off). Header and footer each have a solid/frosted style option.
// Every page reads from this single provider — no scattered local state.

const STORAGE_KEY = 'rk_theme';
const WALLPAPER_KEY = 'rk_wallpaper';
const HEADER_KEY = 'rk_header_style';
const FOOTER_KEY = 'rk_footer_style';

export const WALLPAPERS = [
  { id: 'none', name: 'None' },
  { id: 'mountain', name: 'Mountain' },
  { id: 'ocean', name: 'Ocean' },
  { id: 'forest', name: 'Forest' },
  { id: 'sunset', name: 'Sunset' },
  { id: 'river', name: 'River' },
  { id: 'waterfall', name: 'Waterfall' },
  { id: 'meadow', name: 'Meadow' },
  { id: 'aurora', name: 'Aurora' },
  { id: 'night', name: 'Night' },
];

export const DEFAULT_WALLPAPER = 'mountain';

export const HEADER_STYLES = [
  { id: 'solid', name: 'Solid' },
  { id: 'frosted', name: 'Frosted' },
];

export const FOOTER_STYLES = [
  { id: 'solid', name: 'Solid' },
  { id: 'frosted', name: 'Frosted' },
];

function stored(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export function storedWallpaperId() {
  return WALLPAPERS.some((w) => w.id === stored(WALLPAPER_KEY, null)) ? stored(WALLPAPER_KEY, null) : DEFAULT_WALLPAPER;
}

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

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => stored(STORAGE_KEY, DEFAULT_THEME));
  const [wallpaper, setWallpaperId] = useState(storedWallpaperId);
  const [headerStyle, setHeaderStyle] = useState(() => stored(HEADER_KEY, 'solid'));
  const [footerStyle, setFooterStyle] = useState(() => stored(FOOTER_KEY, 'solid'));

  // Wallpaper mode means "only the wallpaper is visible": the theme palette
  // is NOT applied while a wallpaper is active, so nothing mixes.
  const isWallpaperMode = wallpaper !== 'none';

  useEffect(() => {
    // In wallpaper mode the theme palette stays on the default look; only
    // when no wallpaper is chosen does the chosen theme actually apply.
    applyTheme(themeById(isWallpaperMode ? DEFAULT_THEME : themeId));
    try {
      localStorage.setItem(STORAGE_KEY, themeId);
    } catch {
      /* private mode — applies for this session */
    }
    try {
      localStorage.setItem(WALLPAPER_KEY, wallpaper);
    } catch {
      /* private mode */
    }
  }, [themeId, wallpaper, isWallpaperMode]);

  useEffect(() => {
    try {
      localStorage.setItem(HEADER_KEY, headerStyle);
      localStorage.setItem(FOOTER_KEY, footerStyle);
    } catch {
      /* private mode */
    }
  }, [headerStyle, footerStyle]);

  const setTheme = useCallback((id) => {
    const next = themeById(id).id;
    setThemeId(next);
    // Mutual exclusion: choosing a theme turns the wallpaper off.
    setWallpaperId('none');
  }, []);

  const setWallpaper = useCallback((id) => {
    const valid = WALLPAPERS.some((w) => w.id === id) ? id : 'none';
    setWallpaperId(valid);
    // Mutual exclusion: a wallpaper replaces the theme on screen.
    if (valid !== 'none') setThemeId(DEFAULT_THEME);
  }, []);

  const cycle = useCallback(() => {
    setThemeId((prev) => {
      const i = THEMES.findIndex((t) => t.id === prev);
      return THEMES[(i + 1) % THEMES.length].id;
    });
  }, []);

  const value = useMemo(
    () => ({
      theme: themeById(isWallpaperMode ? DEFAULT_THEME : themeId),
      themes: THEMES,
      setTheme,
      cycle,
      wallpaper,
      setWallpaper,
      isWallpaperMode,
      headerStyle,
      setHeaderStyle,
      footerStyle,
      setFooterStyle,
    }),
    [themeId, wallpaper, isWallpaperMode, setTheme, cycle, setWallpaper, headerStyle, footerStyle, setHeaderStyle, setFooterStyle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
