import { colorsByScheme, type ColorScheme, type ThemeColors } from './colors';
import { radius, spacing } from './spacing';
import { typography } from './typography';

export type Theme = {
  scheme: ColorScheme;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
};

export function createTheme(scheme: ColorScheme): Theme {
  return {
    scheme,
    colors: colorsByScheme[scheme],
    spacing,
    radius,
    typography,
  };
}

export { colorsByScheme, lightColors, darkColors, palette } from './colors';
export type { ColorScheme, ThemeColors } from './colors';
export { spacing, radius } from './spacing';
export { typography, fontFamily, fontSize } from './typography';
