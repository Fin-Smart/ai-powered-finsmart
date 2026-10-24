import { View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';

/** Spent vs limit; turns pink once the limit is passed. */
export function ProgressBar({ used, total, height = 8 }: { used: number; total: number; height?: number }) {
  const { colors } = useTheme().theme;
  const ratio = total > 0 ? used / total : used > 0 ? 1 : 0;
  const over = ratio > 1;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(ratio, 1) * 100) }}
      style={{ height, borderRadius: height / 2, backgroundColor: colors.fill, overflow: 'hidden' }}>
      <View
        style={{
          width: `${Math.min(ratio, 1) * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: over ? colors.secondary : colors.primary,
        }}
      />
    </View>
  );
}
