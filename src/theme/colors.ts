export const palette = {
  black: '#000000',
  white: '#FFFFFF',
  blue: '#007AFF',
  blueDark: '#0A84FF',
  pink: '#FF2D78',
  pinkDark: '#FF4D8D',
  gray50: '#F5F5F7',
  gray100: '#E5E5EA',
  gray400: '#8E8E93',
  gray500: '#6E6E73',
  gray800: '#2C2C2E',
  gray900: '#1C1C1E',
  red: '#FF3B30',
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
  onPrimary: string;
  secondary: string;
  secondaryMuted: string;
  onSecondary: string;
  danger: string;
  overlay: string;
  floatingSurface: string;
  floatingBorder: string;
  floatingActive: string;
  /** Translucent field fill that reads on solid surfaces and on liquid glass. */
  fill: string;
  statusBar: 'light' | 'dark';
};

export const lightColors: ThemeColors = {
  background: palette.white,
  surface: palette.gray50,
  surfaceElevated: palette.white,
  border: palette.gray100,
  text: palette.black,
  textSecondary: palette.gray500,
  textMuted: palette.gray400,
  primary: palette.blue,
  primaryMuted: 'rgba(0, 122, 255, 0.12)',
  onPrimary: palette.white,
  secondary: palette.pink,
  secondaryMuted: 'rgba(255, 45, 120, 0.12)',
  onSecondary: palette.white,
  danger: palette.red,
  overlay: 'rgba(0, 0, 0, 0.4)',
  floatingSurface: palette.white,
  floatingBorder: 'rgba(0, 0, 0, 0.08)',
  floatingActive: 'rgba(0, 0, 0, 0.06)',
  fill: 'rgba(120, 120, 128, 0.12)',
  statusBar: 'dark',
};

export const darkColors: ThemeColors = {
  background: palette.black,
  surface: palette.gray900,
  surfaceElevated: palette.gray800,
  border: palette.gray800,
  text: palette.white,
  textSecondary: palette.gray400,
  textMuted: palette.gray500,
  primary: palette.blueDark,
  primaryMuted: 'rgba(10, 132, 255, 0.18)',
  onPrimary: palette.white,
  secondary: palette.pinkDark,
  secondaryMuted: 'rgba(255, 77, 141, 0.18)',
  onSecondary: palette.white,
  danger: palette.red,
  overlay: 'rgba(0, 0, 0, 0.6)',
  floatingSurface: palette.gray900,
  floatingBorder: 'rgba(255, 255, 255, 0.1)',
  floatingActive: 'rgba(255, 255, 255, 0.1)',
  fill: 'rgba(120, 120, 128, 0.24)',
  statusBar: 'light',
};

export const colorsByScheme: Record<ColorScheme, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};
