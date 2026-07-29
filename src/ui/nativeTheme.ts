import { StyleSheet } from 'react-native';

export const nativeTheme = {
  background: '#f6faf8',
  backgroundAccent: '#e2f1ec',
  surface: '#ffffff',
  surfaceMuted: '#eff7f4',
  ink: '#102a2f',
  muted: '#4d6669',
  subtle: '#6a8081',
  border: '#d5e7e1',
  borderStrong: '#9ac9bc',
  primary: '#135350',
  primaryStrong: '#0a3d3b',
  navy: '#0a272e',
  navySoft: '#164149',
  success: '#11865b',
  successSoft: '#dff5e9',
  danger: '#ef4444',
  dangerSoft: '#fee2e2',
  warning: '#c87914',
  warningSoft: '#fff0d5',
  accent: '#e5b65b',
  accentSoft: '#fff6df',
};

export const nativeStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTheme.background,
  },
  orbTop: {
    position: 'absolute',
    top: -92,
    right: -86,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#c9eee3',
    opacity: 0.95,
  },
  orbBottom: {
    position: 'absolute',
    bottom: -120,
    left: -96,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#f8e6bc',
    opacity: 0.6,
  },
  content: {
    padding: 18,
    paddingBottom: 34,
  },
  heroCard: {
    backgroundColor: nativeTheme.navy,
    borderRadius: 28,
    padding: 22,
    marginBottom: 16,
    shadowColor: nativeTheme.navy,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 8,
  },
  heroEyebrow: {
    color: '#8dd4c2',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  heroText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  card: {
    backgroundColor: nativeTheme.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: nativeTheme.border,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 4,
  },
  sectionEyebrow: {
    color: nativeTheme.subtle,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  sectionTitle: {
    color: nativeTheme.ink,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  label: {
    color: nativeTheme.ink,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
  inputShell: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: nativeTheme.border,
    borderRadius: 16,
    backgroundColor: nativeTheme.surfaceMuted,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: nativeTheme.ink,
    fontSize: 16,
    paddingVertical: 13,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: nativeTheme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    shadowColor: nativeTheme.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  ghostButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: nativeTheme.border,
    backgroundColor: nativeTheme.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  ghostButtonText: {
    color: nativeTheme.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  chip: {
    borderWidth: 1,
    borderColor: nativeTheme.border,
    borderRadius: 999,
    backgroundColor: nativeTheme.surfaceMuted,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  chipActive: {
    borderColor: nativeTheme.primaryStrong,
    backgroundColor: nativeTheme.primary,
  },
  chipText: {
    color: nativeTheme.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  emptyTitle: {
    color: nativeTheme.ink,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  emptyText: {
    color: nativeTheme.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
});

export const formatMoney = (amount: number, currency = 'USD') => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  if (currency === 'TZS') {
    return `${safeAmount.toLocaleString('en-US', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    })} TZS`;
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    return `${safeAmount.toFixed(2)} ${currency}`;
  }
};

export const categoryInitial = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : 'B';
};
