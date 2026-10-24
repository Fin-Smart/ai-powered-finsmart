import { useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useBudgets } from '../budget/BudgetsProvider';
import { allocateIncome } from '../budget/income';
import { defaultCurrency, formatMoney } from '../budget/money';
import type { BudgetSummary } from '../budget/types';
import { useHabitStats } from '../coach/habits';
import { ActivityRings, type Ring } from '../components/dashboard/ActivityRings';
import { BudgetLevels } from '../components/dashboard/BudgetLevels';
import { useChartColors } from '../components/dashboard/palette';
import { SpendingDonut, type Slice } from '../components/dashboard/SpendingDonut';
import { StatTiles } from '../components/dashboard/StatTiles';
import { StillToPay, type UnpaidItem } from '../components/dashboard/StillToPay';
import { TokenMeter } from '../components/dashboard/TokenMeter';
import { WeekChart } from '../components/dashboard/WeekChart';
import { CoachIcon, EventIcon, ShieldIcon, WalletIcon } from '../components/icons';
import { Screen } from '../components/Screen';
import { useAuthUser } from '../hooks/useAuthUser';
import { useTheme } from '../theme/ThemeProvider';

const todayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'long' });
const MAX_SLICES = 5;
const MAX_UNPAID = 4;

const percent = (value: number) => `${Math.round(value * 100)}%`;

/** Spending per category name across budgets, biggest first, with the tail folded into "Other". */
function categorySlices(summaries: BudgetSummary[], series: string[]): Slice[] {
  const byName = new Map<string, number>();
  for (const { budget, spentByCategory } of summaries) {
    for (const [categoryId, cents] of Object.entries(spentByCategory)) {
      const name = budget.categories.find((category) => category.id === categoryId)?.name ?? 'Other';
      byName.set(name, (byName.get(name) ?? 0) + cents);
    }
  }
  const sorted = [...byName.entries()].filter(([, cents]) => cents > 0).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, MAX_SLICES);
  const restCents = sorted.slice(MAX_SLICES).reduce((sum, [, cents]) => sum + cents, 0);
  const otherIndex = top.findIndex(([name]) => name === 'Other');
  if (restCents > 0) {
    if (otherIndex >= 0) top[otherIndex] = ['Other', top[otherIndex][1] + restCents];
    else top.push(['Other', restCents]);
  }
  return top.map(([label, cents], index) => ({ label, cents, color: series[index % series.length] }));
}

export function HomeScreen() {
  const { colors, spacing, typography, radius } = useTheme().theme;
  const chart = useChartColors();
  const user = useAuthUser();
  const habits = useHabitStats();
  const { summaries, income, isLoading } = useBudgets();
  const firstName = user?.displayName?.trim().split(/\s+/)[0];

  // Totals only add up budgets in one currency: the income's, else the first budget's.
  const currency = income?.currency ?? summaries[0]?.budget.currency ?? defaultCurrency();
  const inCurrency = useMemo(
    () => summaries.filter((summary) => summary.budget.currency === currency),
    [currency, summaries],
  );
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

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate() + 1;
  const perDayCents = leftCents > 0 ? Math.floor(leftCents / daysLeft) : 0;

  const categoryCount = summaries.reduce((total, summary) => total + summary.budget.categories.length, 0);
  const paidCount = summaries.reduce((total, summary) => total + summary.paidCategoryIds.length, 0);

  const rings: Ring[] = [
    {
      label: 'Budget spent',
      value: budgetedCents > 0 ? spentCents / budgetedCents : 0,
      detail: budgetedCents > 0 ? percent(spentCents / budgetedCents) : 'No budgets yet',
      color: spentCents > budgetedCents && budgetedCents > 0 ? colors.danger : chart.blue,
    },
    {
      label: 'Bills paid',
      value: categoryCount > 0 ? paidCount / categoryCount : 0,
      detail: categoryCount > 0 ? `${paidCount} of ${categoryCount}` : 'Nothing to pay',
      color: chart.green,
    },
    {
      label: 'Quiz score',
      value: habits.quizAnswered > 0 ? habits.quizCorrect / habits.quizAnswered : 0,
      detail: habits.quizAnswered > 0 ? percent(habits.quizCorrect / habits.quizAnswered) : 'Take a quiz',
      color: chart.orange,
    },
  ];

  const slices = useMemo(() => categorySlices(inCurrency, chart.series), [chart.series, inCurrency]);

  const unpaid = useMemo(() => {
    const items: UnpaidItem[] = [];
    summaries.forEach(({ budget, spentByCategory, paidCategoryIds }, budgetIndex) => {
      for (const category of budget.categories) {
        const left = category.limitCents - (spentByCategory[category.id] ?? 0);
        if (paidCategoryIds.includes(category.id) || left <= 0) continue;
        items.push({
          id: `${budget.id}:${category.id}`,
          name: category.name,
          budgetName: budget.name,
          leftCents: left,
          currency: budget.currency,
          color: chart.series[budgetIndex % chart.series.length],
        });
      }
    });
    return items.sort((a, b) => b.leftCents - a.leftCents);
  }, [chart.series, summaries]);

  const stat = (label: string, value: string, highlight?: boolean) => (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.xs }}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          color: highlight ? colors.danger : colors.text,
          fontFamily: typography.fontFamily.semiBold,
          fontSize: typography.fontSize.md,
        }}>
        {value}
      </Text>
    </View>
  );

  return (
    <Screen title={firstName ? `Hi, ${firstName}` : 'Home'} subtitle={todayFormat.format(now)}>
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
                  color: leftCents < 0 ? colors.danger : colors.text,
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

        <ActivityRings rings={rings} />

        <StatTiles
          tiles={[
            {
              Icon: WalletIcon,
              color: chart.green,
              label: 'Safe to spend a day',
              value: formatMoney(perDayCents, currency),
              detail: leftCents > 0 ? 'to stay on budget' : 'nothing left this month',
            },
            {
              Icon: EventIcon,
              color: chart.orange,
              label: daysLeft === 1 ? 'Day left' : 'Days left',
              value: String(daysLeft),
              detail: `in ${monthFormat.format(now)}`,
            },
            {
              Icon: ShieldIcon,
              color: chart.purple,
              label: 'Flagged by Shield',
              value: String(habits.shieldFlagged),
              detail: `${habits.scamChecks} ${habits.scamChecks === 1 ? 'check' : 'checks'} this month`,
            },
            {
              Icon: CoachIcon,
              color: chart.teal,
              label: habits.lessons === 1 ? 'Lesson' : 'Lessons',
              value: String(habits.lessons),
              detail: `${habits.quizAnswered} quiz ${habits.quizAnswered === 1 ? 'answer' : 'answers'}`,
            },
          ]}
        />

        {summaries.length > 0 ? (
          <BudgetLevels summaries={summaries} />
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

        {slices.length > 0 ? <SpendingDonut slices={slices} currency={currency} /> : null}

        {summaries.length > 0 ? <WeekChart summaries={summaries} currency={currency} /> : null}

        {unpaid.length > 0 ? <StillToPay items={unpaid.slice(0, MAX_UNPAID)} totalCount={unpaid.length} /> : null}

        <TokenMeter />
      </View>
    </Screen>
  );
}
