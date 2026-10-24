import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBudgets } from '../../budget/BudgetsProvider';
import { formatMoney } from '../../budget/money';
import { useHabitStats } from '../../coach/habits';
import { dayKey, useAiUsage } from '../../lib/aiUsage';
import { useTheme } from '../../theme/ThemeProvider';
import { AlertIcon, BellIcon, CheckIcon, CurrencyIcon, ShieldIcon, SparkleIcon, type IconProps } from '../icons';
import { Sheet } from '../Sheet';
import { useChartColors, withAlpha } from './palette';

type Alert = { id: string; title: string; detail: string; Icon: ComponentType<IconProps>; color: string };

const SEEN_KEY = 'home:seen-alerts';
const MAX_SEEN = 100;
const NEAR_LIMIT = 0.9;
const MONTH_END_DAYS = 7;
const LOW_TOKENS = 0.15;

/** Alerts worked out from what the app already knows; ids change when the situation does. */
function useAlerts(): Alert[] {
  const { colors } = useTheme().theme;
  const chart = useChartColors();
  const { summaries, income, isLoading } = useBudgets();
  const habits = useHabitStats();
  const usage = useAiUsage();

  return useMemo(() => {
    const alerts: Alert[] = [];
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;

    for (const { budget, period, spentCents, receivedCents, remainingCents } of summaries) {
      const total = budget.availableCents + receivedCents;
      if (remainingCents < 0) {
        alerts.push({
          id: `over:${budget.id}:${period.start}`,
          title: `${budget.name} is over budget`,
          detail: `You've spent ${formatMoney(-remainingCents, budget.currency)} more than planned for ${period.label}.`,
          Icon: AlertIcon,
          color: colors.danger,
        });
      } else if (total > 0 && spentCents / total >= NEAR_LIMIT) {
        alerts.push({
          id: `near:${budget.id}:${period.start}`,
          title: `${budget.name} is almost used up`,
          detail: `Only ${formatMoney(remainingCents, budget.currency)} left for ${period.label}.`,
          Icon: AlertIcon,
          color: chart.orange,
        });
      }
    }

    if (habits.shieldFlagged > 0) {
      alerts.push({
        id: `shield:${habits.shieldFlagged}`,
        title: `Shield flagged ${habits.shieldFlagged} ${habits.shieldFlagged === 1 ? 'message' : 'messages'}`,
        detail: 'Open Shield to see why before you reply, click a link or pay anything.',
        Icon: ShieldIcon,
        color: chart.purple,
      });
    }

    const unpaid = summaries.reduce(
      (count, summary) => count + summary.budget.categories.length - summary.paidCategoryIds.length,
      0,
    );
    if (unpaid > 0 && daysLeft <= MONTH_END_DAYS) {
      alerts.push({
        id: `unpaid:${monthKey}:${unpaid}`,
        title: `${unpaid} ${unpaid === 1 ? 'item' : 'items'} still to pay`,
        detail: `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left this month. Tick items in your budgets once they're paid.`,
        Icon: CheckIcon,
        color: chart.green,
      });
    }

    if (!usage.isLoading && usage.allowance > 0 && usage.remaining / usage.allowance < LOW_TOKENS) {
      alerts.push({
        id: `tokens:${dayKey()}`,
        title: usage.remaining === 0 ? 'Smart Coach tokens used up' : 'Smart Coach tokens running low',
        detail: 'Your daily allowance resets at midnight.',
        Icon: SparkleIcon,
        color: chart.teal,
      });
    }

    if (!isLoading && !income) {
      alerts.push({
        id: 'income:none',
        title: 'Add your income',
        detail: 'Set your salary or the money you have in Profile to see how much is free to budget.',
        Icon: CurrencyIcon,
        color: chart.blue,
      });
    }

    return alerts;
  }, [chart, colors.danger, habits.shieldFlagged, income, isLoading, summaries, usage]);
}

/** Bell with an unread badge; opens the list of current alerts. */
export function NotificationsButton() {
  const { colors, typography } = useTheme().theme;
  const alerts = useAlerts();
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY)
      .then((raw) => {
        if (raw) setSeen(new Set(JSON.parse(raw) as string[]));
      })
      .catch(() => undefined);
  }, []);

  const unread = alerts.filter((alert) => !seen.has(alert.id)).length;

  const openSheet = () => {
    setOpen(true);
    if (unread === 0) return;
    const next = new Set([...seen, ...alerts.map((alert) => alert.id)]);
    setSeen(next);
    AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...next].slice(-MAX_SEEN))).catch(() => undefined);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={unread ? `Notifications, ${unread} new` : 'Notifications'}
        onPress={openSheet}
        hitSlop={10}
        style={({ pressed }) => ({
          width: 50,
          height: 50,
          borderRadius: 21,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}>
        <BellIcon size={32} color={colors.text} />
        {unread > 0 ? (
          <View
            style={{
              position: 'absolute',
              top: 2,
              right: -6,
              minWidth: 25,
              height: 22,
              paddingHorizontal: 5,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.danger,
              borderWidth: 2,
              borderColor: colors.background,
            }}>
            <Text style={{ color: colors.onPrimary, fontFamily: typography.fontFamily.bold, fontSize: 10 }}>
              {unread > 9 ? '9+' : unread}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <NotificationsSheet visible={open} alerts={alerts} onClose={() => setOpen(false)} />
    </>
  );
}

function NotificationsSheet({ visible, alerts, onClose }: { visible: boolean; alerts: Alert[]; onClose: () => void }) {
  const { colors, spacing, typography, radius } = useTheme().theme;
  const chart = useChartColors();
  const insets = useSafeAreaInsets();

  return (
    <Sheet visible={visible} title="Notifications" onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.sm + 2 }}>
        {alerts.length === 0 ? (
          <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: withAlpha(chart.green, 0.16),
              }}>
              <CheckIcon size={28} color={chart.green} />
            </View>
            <Text style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
              You're all caught up
            </Text>
            <Text style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.fontSize.sm, textAlign: 'center' }}>
              We'll let you know here when a budget runs low or Shield spots something.
            </Text>
          </View>
        ) : (
          alerts.map((alert) => (
            <View
              key={alert.id}
              accessible
              accessibilityLabel={`${alert.title}. ${alert.detail}`}
              style={{
                flexDirection: 'row',
                gap: spacing.sm + 4,
                padding: spacing.md,
                borderRadius: radius.xl,
                backgroundColor: colors.surface,
              }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: withAlpha(alert.color, 0.16),
                }}>
                <alert.Icon size={20} color={alert.color} strokeWidth={2} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.text, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.md }}>
                  {alert.title}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontFamily: typography.fontFamily.regular,
                    fontSize: typography.fontSize.sm,
                    lineHeight: 19,
                  }}>
                  {alert.detail}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </Sheet>
  );
}
