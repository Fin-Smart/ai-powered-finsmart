import { ActivityIndicator, Text, View } from 'react-native';

import { useBudgets } from '../budget/BudgetsProvider';
import { allocateIncome } from '../budget/income';
import { defaultCurrency, formatMoney } from '../budget/money';
import { BudgetLevels } from '../components/dashboard/BudgetLevels';
import { TokenMeter } from '../components/dashboard/TokenMeter';
import { WeekChart } from '../components/dashboard/WeekChart';
import { WalletIcon } from '../components/icons';
import { Screen } from '../components/Screen';
import { useAuthUser } from '../hooks/useAuthUser';
import { useTheme } from '../theme/ThemeProvider';

const todayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

export function HomeScreen() {
  const { colors, spacing, typography, radius } = useTheme().theme;
  const user = useAuthUser();
  const { summaries, income, isLoading } = useBudgets();
  const firstName = user?.displayName?.trim().split(/\s+/)[0];

  // Totals only add up budgets in one currency: the income's, else the first budget's.
  const currency = income?.currency ?? summaries[0]?.budget.currency ?? defaultCurrency();
  const inCurrency = summaries.filter((summary) => summary.budget.currency === currency);
  const leftCents = inCurrency.reduce((total, summary) => total + summary.remainingCents, 0);
  const spentCents = inCurrency.reduce((total, summary) => total + summary.spentCents, 0);
  const budgetedCents = inCurrency.reduce((total, summary) => total + summary.budget.availableCents, 0);
  const freeCents =
    income && income.currency === currency
      ? allocateIncome(
          income,
          summaries.map((summary) => summary.budget),
        ).freeCents
      : null;

  const stat = (label: string, value: string, highlight?: boolean) => (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          color: highlight ? colors.secondary : colors.text,
          fontFamily: typography.fontFamily.semiBold,
          fontSize: typography.fontSize.md,
        }}>
        {value}
      </Text>
    </View>
  );

  return (
    <Screen title={firstName ? `Hi, ${firstName}` : 'Home'} subtitle={todayFormat.format(Date.now())}>
      <View style={{ gap: spacing.xl, marginTop: spacing.lg }}>
        <View style={{ gap: spacing.md, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.surface }}>
          <View style={{ gap: 2 }}>
            <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.medium, fontSize: typography.fontSize.sm }}>
              Left to spend
            </Text>
            {isLoading ? (
              <ActivityIndicator color={colors.textMuted} style={{ alignSelf: 'flex-start', marginVertical: spacing.sm }} />
            ) : (
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  color: leftCents < 0 ? colors.secondary : colors.text,
                  fontFamily: typography.fontFamily.bold,
                  fontSize: 38,
                  letterSpacing: -1,
                }}>
                {leftCents < 0 ? `-${formatMoney(-leftCents, currency)}` : formatMoney(leftCents, currency)}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {stat('Spent', formatMoney(spentCents, currency))}
            {stat('Budgeted', formatMoney(budgetedCents, currency))}
            {freeCents !== null
              ? stat(freeCents < 0 ? 'Over income' : 'Unbudgeted', formatMoney(Math.abs(freeCents), currency), freeCents < 0)
              : null}
          </View>
        </View>

        {summaries.length > 0 ? (
          <>
            <BudgetLevels summaries={summaries} />
            <WeekChart summaries={summaries} currency={currency} />
          </>
        ) : !isLoading ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.lg,
              borderRadius: radius.xl,
              backgroundColor: colors.surface,
            }}>
            <WalletIcon size={28} color={colors.textSecondary} />
            <Text
              style={{
                flex: 1,
                color: colors.textSecondary,
                fontFamily: typography.fontFamily.regular,
                fontSize: typography.fontSize.sm,
                lineHeight: 20,
              }}>
              Create a budget in Profile and your spending charts will appear here.
            </Text>
          </View>
        ) : null}

        <TokenMeter />
      </View>
    </Screen>
  );
}
