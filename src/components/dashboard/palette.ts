import { useTheme } from '../../theme/ThemeProvider';

/** iOS system colours, tuned per scheme, for charts that need several distinct series. */
const LIGHT = {
  blue: '#007AFF',
  green: '#34C759',
  orange: '#FF9500',
  purple: '#AF52DE',
  teal: '#30B0C7',
  indigo: '#5856D6',
  yellow: '#FFB800',
  pink: '#FF2D78',
};

const DARK: typeof LIGHT = {
  blue: '#0A84FF',
  green: '#30D158',
  orange: '#FF9F0A',
  purple: '#BF5AF2',
  teal: '#40C8E0',
  indigo: '#5E5CE6',
  yellow: '#FFD60A',
  pink: '#FF4D8D',
};

export type ChartColors = typeof LIGHT & { series: string[] };

export function useChartColors(): ChartColors {
  const named = useTheme().isDark ? DARK : LIGHT;
  return {
    ...named,
    // Red is kept for "over budget", so the series starts with calmer colours.
    series: [named.blue, named.purple, named.orange, named.green, named.teal, named.indigo, named.yellow, named.pink],
  };
}

/** Adds transparency to a #RRGGBB colour, e.g. for ring tracks. */
export const withAlpha = (hex: string, alpha: number) =>
  `${hex}${Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0')}`;
