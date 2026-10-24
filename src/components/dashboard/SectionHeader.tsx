import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';

export function SectionHeader({ title, accessory }: { title: string; accessory?: ReactNode }) {
  const { colors, spacing, typography } = useTheme().theme;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: spacing.md }}>
      <Text
        accessibilityRole="header"
        style={{ flex: 1, color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.lg }}>
        {title}
      </Text>
      {typeof accessory === 'string' ? (
        <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.sm }}>
          {accessory}
        </Text>
      ) : (
        accessory
      )}
    </View>
  );
}
