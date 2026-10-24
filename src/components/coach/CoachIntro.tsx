import { ScrollView, Text } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { CoachAvatar } from './CoachAvatar';

export function CoachIntro({ bottomInset }: { bottomInset: number }) {
  const { colors, spacing, typography } = useTheme().theme;

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: bottomInset,
      }}>
      <CoachAvatar size={88} />
      <Text
        style={{
          marginTop: spacing.md,
          color: colors.text,
          fontFamily: typography.fontFamily.semiBold,
          fontSize: typography.fontSize.xl,
        }}>
        Smart Coach
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.fontSize.sm,
        }}>
        FinSmart · Money coach
      </Text>
      <Text
        style={{
          marginTop: spacing.md,
          color: colors.text,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.fontSize.sm,
          lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
          textAlign: 'center',
        }}>
        Budgeting, saving, debt, investing. Ask anything, type or talk.
      </Text>
      <Text
        style={{
          marginTop: spacing.sm,
          color: colors.textMuted,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.fontSize.xs,
          textAlign: 'center',
        }}>
        General education, not personal financial advice.
      </Text>
    </ScrollView>
  );
}
