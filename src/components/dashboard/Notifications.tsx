import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBudgets } from '../../budget/BudgetsProvider';
import { formatMoney } from '../../budget/money';
import { useHabitStats } from '../../coach/habits';
import { dayKey, useTokens } from '../../lib/aiUsage';
import { navigate, type QuickIntent } from '../../navigation/quickNav';
import { useTheme } from '../../theme/ThemeProvider';
import {
  AlertIcon,
  BellIcon,
  CheckIcon,
  ChevronRightIcon,
  CurrencyIcon,
  ShieldIcon,
  SparkleIcon,
  type IconProps,
} from '../icons';
import { Sheet } from '../Sheet';
import { SectionHeader } from './SectionHeader';
import { useChartColors, withAlpha } from './palette';

export type Alert = {
  id: string;
  title: string;
  detail: string;
  Icon: ComponentType<IconProps>;
  color: string;
  /** Where tapping the alert takes the person. */
  target?: QuickIntent;
};

const SEEN_KEY = 'home:seen-alerts';
const MAX_SEEN = 100;
const NEAR_LIMIT = 0.9;
const MONTH_END_DAYS = 7;
/** Roughly one Smart Coach reply. */
const LOW_TOKENS = 1000;
const INLINE_LIMIT = 3;
const SHEET_CLOSE_MS = 450;

/** Alerts worked out from what the app already knows; ids change when the situation does. */
export function useAlerts(): Alert[] {
  const { colors } = useTheme().theme;
  const chart = useChartColors();
  const { summaries, income, isLoading } = useBudgets();
  const habits = useHabitStats();
  const tokens = useTokens();

  return useMemo(() => {
    const alerts: Alert[] = [];
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;

    for (const { budget, period, spentCents, receivedCents, remainingCents } of summaries) {
      const total = budget.availableCents + receivedCents;
      const target: QuickIntent = { tab: 'profile', open: { type: 'budget', budgetId: budget.id } };
      if (remainingCents < 0) {
        alerts.push({
          id: `over:${budget.id}:${period.start}`,
          title: `${budget.name} is over budget`,
          detail: `You've spent ${formatMoney(-remainingCents, budget.currency)} more than planned for ${period.label}.`,
          Icon: AlertIcon,
          color: colors.danger,
          target,
        });
      } else if (total > 0 && spentCents / total >= NEAR_LIMIT) {
        alerts.push({
          id: `near:${budget.id}:${period.start}`,
          title: `${budget.name} is almost used up`,
          detail: `Only ${formatMoney(remainingCents, budget.currency)} left for ${period.label}.`,
          Icon: AlertIcon,
          color: chart.orange,
          target,
        });
      }
    }

    if (habits.shieldFlagged > 0) {
      alerts.push({
        id: `shield:${habits.shieldFlagged}`,
        title: `Shield flagged ${habits.shieldFlagged} ${habits.shieldFlagged === 1 ? 'message' : 'messages'}`,
        detail: 'Check why before you reply, click a link or pay anything.',
        Icon: ShieldIcon,
        color: chart.purple,
        target: { tab: 'shield', section: 'email' },
      });
    }

    const withUnpaid = summaries.filter((summary) => summary.budget.categories.length > summary.paidCategoryIds.length);
    const unpaid = withUnpaid.reduce(
      (count, summary) => count + summary.budget.categories.length - summary.paidCategoryIds.length,
      0,
    );
    if (unpaid > 0 && daysLeft <= MONTH_END_DAYS) {
      alerts.push({
        id: `unpaid:${monthKey}:${unpaid}`,
        title: `${unpaid} ${unpaid === 1 ? 'item' : 'items'} still to pay`,
        detail: `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left this month. Tick items once they're paid.`,
        Icon: CheckIcon,
        color: chart.green,
        target: { tab: 'profile', open: { type: 'budget', budgetId: withUnpaid[0].budget.id } },
      });
    }

    if (!tokens.isLoading && tokens.uid && tokens.available < LOW_TOKENS) {
      alerts.push({
        id: `tokens:${dayKey()}:${tokens.available === 0 ? 'empty' : 'low'}`,
        title: tokens.available === 0 ? "You're out of Smart Coach tokens" : 'Smart Coach tokens running low',
        detail:
          tokens.balance > 0
            ? `${tokens.available} tokens left. Top up to keep chatting.`
            : 'Free tokens reset at midnight, or buy a token pack to keep going.',
        Icon: SparkleIcon,
        color: chart.teal,
        target: { tab: 'profile', open: { type: 'tokens' } },
      });
    }

    if (!isLoading && !income) {
      alerts.push({
        id: 'income:none',
        title: 'Add your income',
        detail: 'See how much of your salary or savings is still free to budget.',
        Icon: CurrencyIcon,
        color: chart.blue,
        target: { tab: 'profile', open: { type: 'income' } },
      });
    }

    return alerts;
  }, [chart, colors.danger, habits.shieldFlagged, income, isLoading, summaries, tokens]);
}

function AlertRow({ alert, onPress }: { alert: Alert; onPress?: () => void }) {
  const { colors, spacing, typography, radius } = useTheme().theme;
  const target = alert.target;

  return (
    <Pressable
      accessibilityRole={target ? 'button' : 'text'}
      accessibilityLabel={`${alert.title}. ${alert.detail}`}
      disabled={!target}
      onPress={() => {
        if (!target) return;
        if (!onPress) {
          navigate(target);
          return;
        }
        // Inside the sheet: let it finish closing, since iOS can't present the next sheet meanwhile.
        onPress();
        setTimeout(() => navigate(target), SHEET_CLOSE_MS);
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm + 4,
        padding: spacing.md,
        borderRadius: radius.xl,
        backgroundColor: pressed ? colors.fill : colors.surface,
      })}>
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
      {target ? <ChevronRightIcon size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

/** The first few alerts on the dashboard itself; "See all" opens the full list. */
export function AlertsSection({ alerts, onSeeAll }: { alerts: Alert[]; onSeeAll: () => void }) {
  const { colors, typography } = useTheme().theme;
  if (alerts.length === 0) return null;

  return (
    <View>
      <SectionHeader
        title="Needs attention"
        accessory={
          alerts.length > INLINE_LIMIT ? (
            <Pressable accessibilityRole="button" onPress={onSeeAll} hitSlop={8}>
              <Text style={{ color: colors.primary, fontFamily: typography.fontFamily.semiBold, fontSize: typography.fontSize.sm }}>
                See all {alerts.length}
              </Text>
            </Pressable>
          ) : undefined
        }
      />
      <View style={{ gap: 10 }}>
        {alerts.slice(0, INLINE_LIMIT).map((alert) => (
          <AlertRow key={alert.id} alert={alert} />
        ))}
      </View>
    </View>
  );
}

/** Bell with an unread badge; opens the full list of current alerts. */
export function NotificationsButton({ alerts, open, onOpenChange }: { alerts: Alert[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { colors, typography } = useTheme().theme;
  const [seen, setSeen] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY)
      .then((raw) => {
        if (raw) setSeen(new Set(JSON.parse(raw) as string[]));
      })
      .catch(() => undefined);
  }, []);

  const unread = alerts.filter((alert) => !seen.has(alert.id)).length;

  // Whatever is on screen when the list opens counts as seen.
  useEffect(() => {
    if (!open || unread === 0) return;
    const next = new Set([...seen, ...alerts.map((alert) => alert.id)]);
    setSeen(next);
    AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...next].slice(-MAX_SEEN))).catch(() => undefined);
  }, [alerts, open, seen, unread]);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={unread ? `Notifications, ${unread} new` : 'Notifications'}
        onPress={() => onOpenChange(true)}
        hitSlop={10}
        style={({ pressed }) => ({
          width: 42,
          height: 42,
          borderRadius: 21,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface,
          opacity: pressed ? 0.6 : 1,
        })}>
        <BellIcon size={22} color={colors.text} />
        {unread > 0 ? (
          <View
            style={{
              position: 'absolute',
              top: 4,
              right: 3,
              minWidth: 18,
              height: 18,
              paddingHorizontal: 5,
              borderRadius: 9,
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

      <NotificationsSheet visible={open} alerts={alerts} onClose={() => onOpenChange(false)} />
    </>
  );
}

function NotificationsSheet({ visible, alerts, onClose }: { visible: boolean; alerts: Alert[]; onClose: () => void }) {
  const { colors, spacing, typography } = useTheme().theme;
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
            <Text
              style={{
                color: colors.textSecondary,
                fontFamily: typography.fontFamily.regular,
                fontSize: typography.fontSize.sm,
                textAlign: 'center',
              }}>
              We'll let you know here when a budget runs low or Shield spots something.
            </Text>
          </View>
        ) : (
          alerts.map((alert) => <AlertRow key={alert.id} alert={alert} onPress={onClose} />)
        )}
      </ScrollView>
    </Sheet>
  );
}
