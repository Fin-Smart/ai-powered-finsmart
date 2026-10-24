import { Pressable, ScrollView, Text } from 'react-native';

import { COACH_SUGGESTIONS } from '../../coach/smartCoach';
import { useTheme } from '../../theme/ThemeProvider';

export function QuickReplies({ onSelect }: { onSelect: (text: string) => void }) {
  const { colors, spacing, typography } = useTheme().theme;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={{ marginHorizontal: -spacing.md, marginBottom: spacing.sm + 2 }}
      contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
      {COACH_SUGGESTIONS.map((suggestion) => (
        <Pressable
          key={suggestion}
          accessibilityRole="button"
          onPress={() => onSelect(suggestion)}
          style={({ pressed }) => ({
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 999,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            opacity: pressed ? 0.6 : 1,
          })}>
          <Text
            style={{
              color: colors.text,
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.fontSize.sm,
            }}>
            {suggestion}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
