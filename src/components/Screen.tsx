import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { useBottomNavInset } from './BottomNav';

type ScreenProps = {
  title: string;
  subtitle?: string;
  /** Shown to the right of the title, e.g. an icon button. */
  accessory?: ReactNode;
  children?: ReactNode;
};

export function Screen({ title, subtitle, accessory, children }: ScreenProps) {
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: typography.fontFamily.bold,
            fontSize: typography.fontSize.xxl,
            color: colors.text,
            letterSpacing: -0.5,
          }}>
          {title}
        </Text>
        {accessory}
      </View>
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
