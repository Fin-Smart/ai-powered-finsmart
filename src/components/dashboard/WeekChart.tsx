import { useMemo, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import { formatMoney } from '../../budget/money';
import { startOfDay } from '../../budget/period';
import type { BudgetSummary } from '../../budget/types';
import { useTheme } from '../../theme/ThemeProvider';
import { ControlSlider } from './ControlSlider';
import { SectionHeader } from './SectionHeader';

const HEIGHT = 132;
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const dayName = new Intl.DateTimeFormat(undefined, { weekday: 'long' });

/** Monday to Sunday of the current week, as start-of-day timestamps. */
function currentWeek(now = Date.now()) {
  const today = new Date(now);
  const sinceMonday = (today.getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, index) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - sinceMonday + index).getTime(),
  );
}

/** Spending per day this week, drawn as slim Control Center–style levels. Tap a day to see its total. */
export function WeekChart({ summaries, currency }: { summaries: BudgetSummary[]; currency: string }) {
  const { colors, spacing, typography } = useTheme().theme;
  const { width: screenWidth } = useWindowDimensions();
  const today = startOfDay(Date.now());
  const days = useMemo(() => currentWeek(), []);
  const [selected, setSelected] = useState(() => Math.max(days.indexOf(today), 0));

  const totals = useMemo(() => {
    const byDay = days.map(() => 0);
    for (const summary of summaries) {
      if (summary.budget.currency !== currency) continue;
      for (const transaction of summary.transactions) {
        if (transaction.direction !== 'out') continue;
        const index = days.indexOf(startOfDay(transaction.date));
        if (index >= 0) byDay[index] += transaction.amountCents;
      }
    }
    return byDay;
  }, [currency, days, summaries]);

  const max = Math.max(...totals, 1);
  const weekTotal = totals.reduce((sum, value) => sum + value, 0);
  const gap = spacing.sm;
  const barWidth = (screenWidth - spacing.lg * 2 - gap * 6) / 7;

  return (
    <View>
      <SectionHeader title="This week" accessory={`${formatMoney(weekTotal, currency)} spent`} />

      <Text style={{ marginTop: -spacing.sm, marginBottom: spacing.md, color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm }}>
        {dayName.format(days[selected])}:{' '}
        <Text style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold }}>
          {formatMoney(totals[selected], currency)}
        </Text>
      </Text>

      <View style={{ flexDirection: 'row', gap }}>
        {days.map((day, index) => {
          const isToday = day === today;
          const isFuture = day > today;
          const isSelected = index === selected;
          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${dayName.format(day)}, ${formatMoney(totals[index], currency)} spent`}
              onPress={() => setSelected(index)}
              style={{ alignItems: 'center', gap: spacing.sm, opacity: isFuture ? 0.45 : 1 }}>
              <ControlSlider
                value={totals[index] / max}
                width={barWidth}
                height={HEIGHT}
                tint={isSelected ? colors.primary : colors.text}
                accessibilityLabel={`${dayName.format(day)} spending`}
              />
              <Text
                style={{
                  color: isSelected ? colors.primary : isToday ? colors.text : colors.textMuted,
                  fontFamily: isSelected || isToday ? typography.fontFamily.semiBold : typography.fontFamily.medium,
                  fontSize: typography.fontSize.xs,
                }}>
                {DAY_LETTERS[index]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
