import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const webStorage = createJSONStorage(() => ({
  getItem: (name: string) => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(name);
  },
  setItem: (name: string, value: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(name, value);
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(name);
  },
}));

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'light',
      setMode: (mode) => set({ mode }),
      toggleMode: () => set((state) => ({ mode: state.mode === 'light' ? 'dark' : 'light' })),
    }),
    {
      name: 'budget-it-theme',
      storage: webStorage,
    }
  )
);

export const themeTokens = {
  light: {
    background: '#f5f7fb',
    backgroundAccent: '#eef4ff',
    surface: 'rgba(255,255,255,0.82)',
    surfaceMuted: 'rgba(255,255,255,0.92)',
    surfaceStrong: '#ffffff',
    text: '#0f172a',
    textMuted: '#475569',
    textSubtle: '#64748b',
    border: 'rgba(148,163,184,0.18)',
    borderStrong: 'rgba(37,99,235,0.14)',
    primary: '#2563eb',
    primaryStrong: '#1d4ed8',
    success: '#10b981',
    successText: '#166534',
    danger: '#ef4444',
    dangerText: '#b91c1c',
    shadow: '0 18px 40px rgba(15,23,42,0.08)',
    heroGradient: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 45%, #ffffff 100%)',
    navSurface: 'rgba(255,255,255,0.88)',
  },
  dark: {
    background: '#0f172a',
    backgroundAccent: '#111827',
    surface: 'rgba(30,41,59,0.88)',
    surfaceMuted: 'rgba(15,23,42,0.96)',
    surfaceStrong: '#1e293b',
    text: '#f8fafc',
    textMuted: '#cbd5e1',
    textSubtle: '#94a3b8',
    border: 'rgba(148,163,184,0.16)',
    borderStrong: 'rgba(59,130,246,0.22)',
    primary: '#60a5fa',
    primaryStrong: '#3b82f6',
    success: '#22c55e',
    successText: '#bbf7d0',
    danger: '#f87171',
    dangerText: '#fecaca',
    shadow: '0 18px 40px rgba(0,0,0,0.32)',
    heroGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 45%, #2563eb 100%)',
    navSurface: 'rgba(15,23,42,0.88)',
  },
} as const;

export const applyWebTheme = (mode: ThemeMode) => {
  if (typeof document === 'undefined') return;

  const theme = themeTokens[mode];
  const root = document.documentElement;

  root.style.setProperty('--app-bg', theme.background);
  root.style.setProperty('--app-bg-accent', theme.backgroundAccent);
  root.style.setProperty('--app-surface', theme.surface);
  root.style.setProperty('--app-surface-muted', theme.surfaceMuted);
  root.style.setProperty('--app-surface-strong', theme.surfaceStrong);
  root.style.setProperty('--app-text', theme.text);
  root.style.setProperty('--app-text-muted', theme.textMuted);
  root.style.setProperty('--app-text-subtle', theme.textSubtle);
  root.style.setProperty('--app-border', theme.border);
  root.style.setProperty('--app-border-strong', theme.borderStrong);
  root.style.setProperty('--app-primary', theme.primary);
  root.style.setProperty('--app-primary-strong', theme.primaryStrong);
  root.style.setProperty('--app-success', theme.success);
  root.style.setProperty('--app-success-text', theme.successText);
  root.style.setProperty('--app-danger', theme.danger);
  root.style.setProperty('--app-danger-text', theme.dangerText);
  root.style.setProperty('--app-shadow', theme.shadow);
  root.style.setProperty('--app-hero-gradient', theme.heroGradient);
  root.style.setProperty('--app-nav-surface', theme.navSurface);
  document.body.style.backgroundColor = theme.background;
  document.body.style.color = theme.text;
  document.body.dataset.theme = mode;
};
