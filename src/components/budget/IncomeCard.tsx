import { Pressable, Text, View } from 'react-native';

import { useBudgets } from '../../budget/BudgetsProvider';
import { allocateIncome, INCOME_LABELS } from '../../budget/income';
import { formatMoney } from '../../budget/money';
import { useTheme } from '../../theme/ThemeProvider';
import { ChevronRightIcon, CurrencyIcon } from '../icons';
import { SettingsGroup, SettingsRow } from '../settings/SettingsList';
import { ProgressBar } from './ProgressBar';

/** Income at the top of the budgets section, with how much of it budgets already use. */
export function IncomeCard({ onPress }: { onPress: () => void }) {
  const { colors, spacing, typography, radius } = useTheme().theme;
  const { income, summaries, isLoading } = useBudgets();

  if (!income) {
    return (
      <SettingsGroup footer="Add your salary or the money you have. Each budget is taken from it, so you always see what's left.">
        <SettingsRow Icon={CurrencyIcon} label="Set your income" busy={isLoading} onPress={onPress} />
      </SettingsGroup>
    );
  }

  const money = (cents: number) => formatMoney(cents, income.currency);
  const { allocatedCents, freeCents } = allocateIncome(
    income,
    summaries.map((summary) => summary.budget),
  );
  const over = freeCents < 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${INCOME_LABELS[income.kind]} ${money(income.amountCents)}, ${
        over ? `budgets are ${money(-freeCents)} more than you have` : `${money(freeCents)} free to budget`
      }`}
      accessibilityHint="Edit your income"
      onPress={onPress}
      style={({ pressed }) => ({
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.xl,
        backgroundColor: pressed ? colors.fill : colors.surface,
      })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.xs }}>
            {INCOME_LABELS[income.kind]}
          </Text>
          <Text style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.xl }}>
            {money(income.amountCents)}
          </Text>
        </View>
        <ChevronRightIcon size={18} color={colors.textMuted} />
      </View>
      <ProgressBar used={allocatedCents} total={income.amountCents} height={6} />
      <Text
        style={{
          color: over ? colors.secondary : colors.textSecondary,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.fontSize.sm,
        }}>
        {over
          ? `Budgets are ${money(-freeCents)} more than you have`
          : `${money(allocatedCents)} in budgets · ${money(freeCents)} free to budget`}
      </Text>
    </Pressable>
  );
}
