import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const KEY = 'novel-flow-theme';

function readMode(): ThemeMode {
  try {
    const m = localStorage.getItem(KEY);
    if (m === 'light' || m === 'dark' || m === 'system') return m;
  } catch {
    /* storage blocked */
  }
  return 'system';
}

function systemDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

function resolve(mode: ThemeMode): ResolvedTheme {
  return mode === 'dark' || (mode === 'system' && systemDark()) ? 'dark' : 'light';
}

function apply(theme: ResolvedTheme, animate: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (animate) {
    root.classList.add('nf-theme-anim');
    window.setTimeout(() => root.classList.remove('nf-theme-anim'), 320);
  }
  root.dataset.theme = theme;
}

interface ThemeState {
  mode: ThemeMode;
  theme: ResolvedTheme;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}

/** Light / dark theme. Saved in localStorage; "system" follows the OS setting. */
export const useTheme = create<ThemeState>((set, get) => {
  const mode = readMode();
  const theme = resolve(mode);
  apply(theme, false);

  if (typeof window !== 'undefined' && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
      if (get().mode !== 'system') return;
      const t = resolve('system');
      apply(t, true);
      set({ theme: t });
    });
  }

  return {
    mode,
    theme,
    setMode: (m) => {
      try {
        localStorage.setItem(KEY, m);
      } catch {
        /* ignore */
      }
      const t = resolve(m);
      apply(t, true);
      set({ mode: m, theme: t });
    },
    toggle: () => get().setMode(get().theme === 'dark' ? 'light' : 'dark'),
  };
});
