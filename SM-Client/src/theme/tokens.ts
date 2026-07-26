// Design tokens for San Mines — dark theme only

export const colors = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  bg: {
    base: '#090D1A',      // deepest screen background
    screen: '#0F172A',    // standard screen background
    surface: '#1E293B',   // cards, modals, headers
    elevated: '#334155',  // borders, dividers, disabled states
    overlay: 'rgba(0,0,0,0.6)',
  },

  // ── Text ─────────────────────────────────────────────────────────────────
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    muted: '#64748B',
    disabled: '#475569',
    inverse: '#FFFFFF',
    error: '#F87171',
  },

  // ── Border ───────────────────────────────────────────────────────────────
  border: {
    default: '#334155',
    subtle: '#1E293B',
    focus: '#3B82F6',
    error: '#DC2626',
  },

  // ── Brand / Accent ────────────────────────────────────────────────────────
  accent: {
    indigo: '#6366F1',
    indigoLight: '#818CF8',
    indigoDark: '#4338CA',
  },

  // ── Role / Action Colors ──────────────────────────────────────────────────
  primary: {
    default: '#1E40AF',   // quarry blue — primary button, quarry role
    light: '#3B82F6',
    lighter: '#60A5FA',
  },
  success: {
    default: '#16A34A',   // unload green — secondary button, completed
    light: '#10B981',
    lighter: '#4ADE80',
  },
  danger: {
    default: '#DC2626',   // errors, delete, geofence breach
    light: '#EF4444',
    lighter: '#F87171',
  },
  warning: {
    default: '#D97706',   // in-quarry, GPS acquiring
    light: '#F59E0B',
    lighter: '#FCD34D',
  },

  // ── Trip Status Colors ────────────────────────────────────────────────────
  status: {
    insideQuarry: {
      bg: '#2D1B00',
      text: '#FCD34D',
      border: '#92400E',
    },
    inTransit: {
      bg: '#1E3A5F',
      text: '#60A5FA',
      border: '#1E40AF',
    },
    unloaded: {
      bg: '#052E16',
      text: '#4ADE80',
      border: '#166534',
    },
    flagged: {
      bg: '#1F0A0A',
      text: '#F87171',
      border: '#991B1B',
    },
  },

  // ── Role Badge Colors ─────────────────────────────────────────────────────
  role: {
    superAdmin: '#4F46E5',
    quarryOperator: '#1E40AF',
    unloadOperator: '#16A34A',
  },

  // ── Utility ───────────────────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
} as const;

export const fontSize = {
  xs: 10,
  sm: 11,
  md: 13,
  base: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

export const touchTarget = 52; // minimum accessible touch target height

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 2,
  },
} as const;
