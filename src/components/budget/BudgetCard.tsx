import { Pressable, Text, View } from 'react-native';

import { formatMoney } from '../../budget/money';
import type { BudgetSummary } from '../../budget/types';
import { useTheme } from '../../theme/ThemeProvider';
import { ProgressBar } from './ProgressBar';

export function BudgetCard({ summary, onPress }: { summary: BudgetSummary; onPress: () => void }) {
  const { colors, spacing, typography, radius } = useTheme().theme;
  const { budget, period, spentCents, remainingCents } = summary;
  const total = budget.availableCents + summary.receivedCents;
  const over = remainingCents < 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${budget.name}, ${over ? `${formatMoney(-remainingCents, budget.currency)} over` : `${formatMoney(remainingCents, budget.currency)} left`}`}
      onPress={onPress}
      style={({ pressed }) => ({
        gap: spacing.sm + 2,
        padding: spacing.md,
        borderRadius: radius.xl,
        backgroundColor: colors.surface,
        opacity: pressed ? 0.85 : 1,
      })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text numberOfLines={1} style={{ flexShrink: 1, color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
          {budget.name}
        </Text>
        <Text
          style={{
            overflow: 'hidden',
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
            borderRadius: 6,
            backgroundColor: colors.fill,
            color: colors.textSecondary,
            fontFamily: typography.fontFamily.medium,
            fontSize: 11,
          }}>
          {budget.label}
        </Text>
        <Text style={{ marginLeft: 'auto', color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
          {period.label}
        </Text>
      </View>

      <ProgressBar used={spentCents} total={total} />

      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text style={{ color: over ? colors.secondary : colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.lg }}>
          {over ? `${formatMoney(-remainingCents, budget.currency)} over` : `${formatMoney(remainingCents, budget.currency)} left`}
        </Text>
        <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
          {formatMoney(spentCents, budget.currency)} of {formatMoney(total, budget.currency)} spent
        </Text>
      </View>
    </Pressable>
  );
}
