import { Pressable, ScrollView, Text } from 'react-native';

import { COACH_SUGGESTIONS } from '../../coach/smartCoach';
import { useTheme } from '../../theme/ThemeProvider';

type QuickAction = { label: string; onPress: () => void };

/** Featured actions (filled) followed by suggested questions (outlined). */
export function QuickReplies({ actions = [], onSelect }: { actions?: QuickAction[]; onSelect: (text: string) => void }) {
  const { colors, spacing, typography } = useTheme().theme;
  const chips = [
    ...actions.map((action) => ({ ...action, featured: true })),
    ...COACH_SUGGESTIONS.map((suggestion) => ({ label: suggestion, onPress: () => onSelect(suggestion), featured: false })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={{ marginHorizontal: -spacing.md, marginBottom: spacing.sm + 2 }}
      contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
      {chips.map((chip) => (
        <Pressable
          key={chip.label}
          accessibilityRole="button"
          onPress={chip.onPress}
          style={({ pressed }) => ({
            backgroundColor: chip.featured ? colors.text : colors.background,
            borderColor: chip.featured ? colors.text : colors.border,
            borderWidth: 1,
            borderRadius: 999,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            opacity: pressed ? 0.6 : 1,
          })}>
          <Text
            style={{
              color: chip.featured ? colors.background : colors.text,
              fontFamily: chip.featured ? typography.fontFamily.semiBold : typography.fontFamily.medium,
              fontSize: typography.fontSize.sm,
            }}>
            {chip.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
