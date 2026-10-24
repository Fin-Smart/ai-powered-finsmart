import type { ReactNode } from 'react';
import { ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { useBottomNavInset } from './BottomNav';

type ScreenProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

export function Screen({ title, subtitle, children }: ScreenProps) {
  const { colors, spacing, typography } = useTheme().theme;
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomNavInset();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
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
      {subtitle ? (
        <Text
          style={{
            marginTop: 2,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.fontSize.sm,
            color: colors.textSecondary,
          }}>
          {subtitle}
        </Text>
      ) : null}
      {children}
    </ScrollView>
  );
}
