import { Pressable, Text, View } from 'react-native';

import { formatMoney } from '../../budget/money';
import type { BudgetSummary } from '../../budget/types';
import { useTheme } from '../../theme/ThemeProvider';
import { ChevronRightIcon, WalletIcon } from '../icons';
import { ProgressBar } from './ProgressBar';

/** A budget as a settings-style row, meant to sit inside a `SettingsGroup`. */
export function BudgetCard({ summary, onPress }: { summary: BudgetSummary; onPress: () => void }) {
  const { colors, spacing, typography } = useTheme().theme;
  const { budget, period, spentCents, remainingCents } = summary;
  const total = budget.availableCents + summary.receivedCents;
  const over = remainingCents < 0;
  const amount = over
    ? `${formatMoney(-remainingCents, budget.currency)} over`
    : `${formatMoney(remainingCents, budget.currency)} left`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${budget.name}, ${budget.label}, ${period.label}, ${amount}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm + 4,
        minHeight: 64,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        backgroundColor: pressed ? colors.fill : 'transparent',
      })}>
      <View style={{ width: 28, alignItems: 'center' }}>
        <WalletIcon size={22} color={colors.text} />
      </View>

      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
          <Text
            numberOfLines={1}
            style={{ flex: 1, color: colors.text, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.md }}>
            {budget.name}
          </Text>
          <Text
            style={{
              color: over ? colors.secondary : colors.textSecondary,
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.fontSize.sm,
            }}>
            {amount}
          </Text>
        </View>
        <ProgressBar used={spentCents} total={total} height={4} />
        <Text numberOfLines={1} style={{ color: colors.textMuted, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
          {budget.label} · {period.label}
        </Text>
      </View>

      <ChevronRightIcon size={18} color={colors.textMuted} />
    </Pressable>
  );
}
