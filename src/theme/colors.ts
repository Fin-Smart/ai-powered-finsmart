/** Premier League brand palette */
export const palette = {
  purple: '#38003C',
  purpleDeep: '#1F0022',
  purpleMid: '#4A0A50',
  purpleSoft: '#5C1A62',
  magenta: '#E90052',
  cyan: '#04F5FF',
  green: '#00FF85',
  white: '#FFFFFF',
  offWhite: '#F7F4F8',
  mist: '#C4B8C8',
  slate: '#6B5E70',
} as const;

export type ColorScheme = 'light' | 'dark';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryMuted: string;
  accent: string;
  accentMagenta: string;
  accentCyan: string;
  onPrimary: string;
  danger: string;
  warning: string;
  overlay: string;
  statusBar: 'light' | 'dark';
};

export const lightColors: ThemeColors = {
  background: palette.offWhite,
  surface: palette.white,
  surfaceElevated: palette.white,
  border: '#E8DFEC',
  text: palette.purple,
  textSecondary: '#5A4460',
  textMuted: palette.slate,
  primary: palette.purple,
  primaryMuted: '#F0E6F2',
  accent: palette.green,
  accentMagenta: palette.magenta,
  accentCyan: palette.cyan,
  onPrimary: palette.white,
  danger: palette.magenta,
  warning: '#F5A623',
  overlay: 'rgba(56, 0, 60, 0.45)',
  statusBar: 'dark',
};

export const darkColors: ThemeColors = {
  background: palette.purpleDeep,
  surface: palette.purple,
  surfaceElevated: palette.purpleMid,
  border: palette.purpleSoft,
  text: palette.white,
  textSecondary: palette.mist,
  textMuted: '#8F7A96',
  primary: palette.green,
  primaryMuted: 'rgba(0, 255, 133, 0.15)',
  accent: palette.green,
  accentMagenta: palette.magenta,
  accentCyan: palette.cyan,
  onPrimary: palette.purpleDeep,
  danger: palette.magenta,
  warning: '#F5A623',
  overlay: 'rgba(0, 0, 0, 0.55)',
  statusBar: 'light',
};

export const colorsByScheme: Record<ColorScheme, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};
