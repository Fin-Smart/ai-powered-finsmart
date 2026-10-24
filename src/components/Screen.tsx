import type { ReactNode } from 'react';
import { ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { useBottomNavInset } from './BottomNav';

type ScreenProps = {
  title: string;
  children?: ReactNode;
};

export function Screen({ title, children }: ScreenProps) {
  const { colors, spacing, typography } = useTheme().theme;
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomNavInset();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingHorizontal: spacing.lg,
        paddingBottom: bottomInset,
      }}>
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: typography.fontFamily.bold,
          fontSize: typography.fontSize.xxl,
          color: colors.text,
          letterSpacing: -0.5,
        }}>
        {title}
      </Text>
      {children}
    </ScrollView>
  );
}
